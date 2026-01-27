---
trigger: model_decision
description: Let a user click “Sign in with Base,” prove ownership of their onchain account, and give your server everything it needs to create a session – using open standards and no passwords
---

# Authenticate Users

> Let a user click “Sign in with Base,” prove ownership of their onchain account, and give your server everything it needs to create a session – using open standards and no passwords

export const SignInWithBaseButton = ({colorScheme = 'light'}) => {
  const isLight = colorScheme === 'light';
  return <button type="button" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: isLight ? '#ffffff' : '#000000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    color: isLight ? '#000000' : '#ffffff',
    minWidth: '180px',
    height: '44px'
  }}>
      <div style={{
    width: '16px',
    height: '16px',
    backgroundColor: isLight ? '#0000FF' : '#FFFFFF',
    borderRadius: '2px',
    flexShrink: 0
  }} />
      <span>Sign in with Base</span>
    </button>;
};

export const BasePayButton = ({colorScheme = 'light'}) => {
  const isLight = colorScheme === 'light';
  return <button type="button" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    backgroundColor: isLight ? '#ffffff' : '#0000FF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '180px',
    height: '44px'
  }}>
      <img src={isLight ? '/images/base-account/BasePayBlueLogo.png' : '/images/base-account/BasePayWhiteLogo.png'} alt="Base Pay" style={{
    height: '20px',
    width: 'auto'
  }} />
    </button>;
};

## Why wallet signatures instead of passwords?

1. **No new passwords** – authentication happens with the key the user already controls.
2. **Nothing to steal or reuse** – each login is a one-off, domain-bound signature that never leaves the user’s device.
3. **Wallet-agnostic** – works in any EIP-1193 wallet (browser extension, mobile deep-link, embedded provider) and follows the open ["Sign in with Ethereum" (SIWE) EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) standard.

Base Accounts build on those standards so you can reuse any SIWE tooling – while still benefiting from passkeys, session keys, and smart-wallet security.

<Warning>
  **Please Follow the Brand Guidelines**

  If you intend on using the `SignInWithBaseButton`, please follow the [Brand Guidelines](/base-account/reference/ui-elements/brand-guidelines) to ensure consistency across your application.
</Warning>

<Tip>
  **Do you prefer video content?**

  There is a video guide that covers the implementation in detail in the [last section of this page](#video-guide).
</Tip>

## High-level flow

```mermaid  theme={null}
sequenceDiagram
    participant User
    participant Browser
    participant AppServer as "App Server"
    participant SDK
    participant Account

    alt Generate locally
        Browser->>Browser: randomNonce()
    else Prefetch
        Browser->>AppServer: GET /auth/nonce (on page load)
        AppServer-->>Browser: nonce
    end

    User->>Browser: Click "Sign in with Base"
    Browser->>SDK: wallet_connect(signInWithEthereum {nonce})
    SDK->>Account: wallet_connect(...)
    User->>Account: Approve connection
    Account-->>SDK: {address, message, signature}
    SDK-->>Browser: {address, message, signature}

    Browser-->>AppServer: POST /auth/verify {address, message, signature}
    AppServer-->>Browser: session token / JWT
```

<Note type="info">
  **Undeployed Smart Wallets?**

  Base Account signatures include the [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492) wrapper so they can be verified even before the wallet contract is deployed. Viem’s [`verifyMessage`](https://viem.sh/docs/actions/public/verifyMessage) and [`verifyTypedData`](https://viem.sh/docs/actions/public/verifyTypedData) handle this automatically.
</Note>

## Implementation

### Install Dependencies

Make sure to install the dependencies:

<CodeGroup>
  ```bash npm theme={null}
  npm install @base-org/account @base-org/account-ui
  ```

  ```bash pnpm theme={null}
  pnpm add @base-org/account @base-org/account-ui
  ```

  ```bash yarn theme={null}
  yarn add @base-org/account @base-org/account-ui
  ```

  ```bash bun theme={null}
  bun add @base-org/account @base-org/account-ui
  ```
</CodeGroup>

### Code Snippets

<CodeGroup>
  ```ts Browser (SDK) expandable theme={null}
  import { createBaseAccountSDK } from "@base-org/account";

  // Initialize the SDK
  const provider = createBaseAccountSDK({
    appName: "My App",
  }).getProvider();

  // 1 — get a fresh nonce (generate locally or prefetch from backend)
  const nonce = window.crypto.randomUUID().replace(/-/g, "");
  // OR prefetch from server
  // const nonce = await fetch("/auth/nonce").then((response) => response.text());

  // 2 — switch to Base Chain
  const switchChainResponse = await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x2105" }],
  });

  console.log("Switch chain response:", switchChainResponse);

  // 3 — connect and authenticate
  try {
    const { accounts } = await provider.request({
      method: "wallet_connect",
      params: [
        {
          version: "1",
          capabilities: {
            signInWithEthereum: {
              nonce,
              chainId: "0x2105", // Base Mainnet - 8453
            },
          },
        },
      ],
    });

    const { address } = accounts[0];
    const { message, signature } =
      accounts[0].capabilities.signInWithEthereum;

    await fetch("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, message, signature }),
    });
  } catch (error) {
    console.error("Failed to authenticate with Base Account:", error);
  }

  ```

  ```ts Backend (Viem) theme={null}
  import { createPublicClient, http } from 'viem';
  import { base } from 'viem/chains';

  const client = createPublicClient({ chain: base, transport: http() });

  export async function verifySig(req, res) {
    const { address, message, signature } = req.body;
    const valid = await client.verifyMessage({ address, message, signature });
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });
    // create session / JWT
    res.json({ ok: true });
  }
  ```
</CodeGroup>

<Note type="tip">
  If using the above code beyond Base Account, note that not every wallet
  supports the new [<code>wallet\_connect</code>{" "}
  method](/base-account/reference/core/provider-rpc-methods/wallet_connect) yet.
  If the call throws \[<code>method\_not\_supported</code>], fall back to using{" "}
  <code>eth\_requestAccounts</code> and <code>personal\_sign</code>.
</Note>

<Note type="tip">
  To avoid [popup
  blockers](/base-account/more/troubleshooting/usage-details/popups#default-blocking-behavior),
  fetch or generate the nonce <strong>before</strong> the user presses "Sign in
  with Base" (for example on page load). For security, the only requirement is
  that your backend keeps track of every nonce and refuses any that are reused –
  regardless of where it originated.
</Note>

### Example Express Server

```ts title="server/auth.ts" expandable theme={null}
import crypto from "crypto";
import express from "express";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const app = express();
app.use(express.json());

// Simple in-memory nonce store (swap for Redis or DB in production)
const nonces = new Set<string>();

app.get("/auth/nonce", (_, res) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  nonces.add(nonce);
  res.send(nonce);
});

const client = createPublicClient({ chain: base, transport: http() });

app.post("/auth/verify", async (req, res) => {
  const { address, message, signature } = req.body;

  // 1. Check nonce hasn\'t been reused
  const nonce = message.match(/at (\w{32})$/)?.[1];
  if (!nonce || !nonces.delete(nonce)) {
    return res.status(400).json({ error: "Invalid or reused nonce" });
  }

  // 2. Verify signature
  const valid = await client.verifyMessage({ address, message, signature });
  if (!valid) return res.status(401).json({ error: "Invalid signature" });

  // 3. Create session / JWT here
  res.json({ ok: true });
});

app.listen(3001, () => console.log("Auth server listening on :3001"));
```

## Add the Base Sign In With Base Button

Use the pre-built component for a native look-and-feel:

```tsx title="App.tsx" theme={null}
import { SignInWithBaseButton } from "@base-org/account-ui/react";

export function App() {
  return (
    <SignInWithBaseButton
      colorScheme="light"
      onClick={() => signInWithBase()}
    />
  );
}
```

See full props and theming options in the [Button Reference](/base-account/reference/ui-elements/sign-in-with-base-button) and [Brand Guidelines](/base-account/reference/ui-elements/brand-guidelines).

<Warning>
  **Please Follow the Brand Guidelines**

  If you intend on using the `SignInWithBaseButton`, please follow the [Brand Guidelines](/base-account/reference/ui-elements/brand-guidelines) to ensure consistency across your application.
</Warning>

## Video Guide

<iframe width="560" height="315" src="https://www.youtube.com/embed/s9X_tUhkf9E?si=GOO5AkOyq7j-un9I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
