---
trigger: model_decision
description: Learn how to create and use Sub Accounts using Base Account SDK
---

# Use Sub Accounts

> Learn how to create and use Sub Accounts using Base Account SDK

export const GithubRepoCard = ({title, githubUrl}) => {
  return <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="mb-4 flex items-center rounded-lg bg-zinc-900 p-4 text-white transition-all hover:bg-zinc-800">
      <div className="flex w-full items-center gap-3">
        <svg height="24" width="24" className="flex-shrink-0 dark:fill-white" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>

        <div className="flex min-w-0 flex-grow flex-col">
          <span className="truncate text-base font-medium">{title}</span>
          <span className="truncate text-xs text-zinc-400">{githubUrl}</span>
        </div>

        <svg className="h-5 w-5 flex-shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>;
};

## What are Sub Accounts?

Sub Accounts allow you to provision app-specific wallet accounts for your users that are embedded directly in your application. Once created, you can interact with them just as you would with any other wallet via the wallet provider or popular onchain libraries like OnchainKit, wagmi, and viem.

<Note>
  Looking for a full implementation? Jump to the [Complete Integration Example](/base-account/improve-ux/sub-accounts#complete-integration-example).
</Note>

<Tip>
  **Do you prefer video content?**

  There is a video guide that covers the implementation in detail in the [last section of this page](#video-guide).
</Tip>

## Key Benefits

* **Frictionless transactions**: Eliminate repeated signing prompts for high frequency and agentic use cases or take full control of the transaction flow.
* **No funding flows required**: Spend Permissions allow Sub Accounts to spend directly from the universal Base Account's balance.
* **User control**: Users can manage all their sub accounts at [account.base.app](https://account.base.app).

<Note>
  If you would like to see a live demo of Sub Accounts in action, check out our [Sub Accounts Demo](https://sub-accounts-fc.vercel.app).
</Note>

<Tip>
  **Spend Permissions**

  Sub Accounts are optimized for use with Spend Permissions to allow your app to take advantage of the user's existing Base Account balances. See the [Spend Permissions](/base-account/improve-ux/spend-permissions) guide for more information about how they work.
</Tip>

## Installation

Install the Base Account SDK:

<CodeGroup>
  ```bash npm theme={null}
  npm install @base-org/account
  ```

  ```bash pnpm theme={null}
  pnpm add @base-org/account
  ```

  ```bash yarn theme={null}
  yarn add @base-org/account
  ```

  ```bash bun theme={null}
  bun add @base-org/account
  ```
</CodeGroup>

## Quickstart

The fastest way to adopt Sub Accounts is to set `creation` to `on-connect` and `defaultAccount` to `sub` in the SDK configuration.

```tsx page.tsx theme={null}
const sdk = createBaseAccountSDK({
  // ...
  subAccounts: {
    creation: 'on-connect',
    defaultAccount: 'sub',
  }
});
```

This will automatically create a Sub Account for the user when they connect their Base Account and transactions will automatically be sent from the Sub Account unless you specify the `from` parameter in your transaction request to be the universal account address. Spend Permissions will also be automatically requested for the Sub Account as your app needs them.

This is what the user will see when they connect their Base Account and automatic Sub Accounts are enabled:

<div style={{ display: 'flex', justifyContent: 'center'}}>
  <img src="https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=4551f5206023cd25048ea23888e9e5f6" alt="Sub Account Creation Flow" style={{ width: '300px', height: 'auto' }} data-og-width="532" width="532" data-og-height="875" height="875" data-path="images/base-account/SubAccountCreationConnect.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=280&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=2361efbff0a9f45000b5093175c927d0 280w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=560&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=d032c913bc4f17b1a2864e12d60c1d19 560w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=840&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=9846bb971ddb01fff342d6a8906c3986 840w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=1100&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=fcc1cf8ddaa9544f305fc0e70a437836 1100w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=1650&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=4f0cfb396cada939400bac9d6d64126e 1650w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreationConnect.png?w=2500&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=8d248474e9f5bb2aab9fb89b7f3a6294 2500w" />
</div>

<Tip>
  We recommend using a [Paymaster](/base-account/improve-ux/sponsor-gas/paymasters) to sponsor gas to ensure the best user experience when integrating Sub Accounts. You can set a paymaster to be used for all transactions by configuring the `paymasterUrls` parameter in the SDK configuration. See the [createBaseAccount](/base-account/reference/core/createBaseAccount#param-paymaster-urls) reference for more information.
</Tip>

<Tip>
  **Do you prefer video content?**

  There is a video guide that covers this specific implementation in the [last section of this page](#video-guide).
</Tip>

## Using Sub Accounts

### Initialize the SDK

First, set up the Base Account SDK. Be sure to customize the `appName` and `appLogoUrl` to match your app as this will be displayed in the wallet connection popup and in the account.base.app dashboard. You can also customize the `appChainIds` to be the chains that your app supports.

```tsx page.tsx theme={null}
import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { base } from 'viem/chains';

// Initialize SDK with Sub Account configuration
const sdk = createBaseAccountSDK({
  appName: 'Base Account SDK Demo',
  appLogoUrl: 'https://base.org/logo.png',
  appChainIds: [base.id],
});

// Get an EIP-1193 provider
const provider = sdk.getProvider()
```

### Create a Sub Account

<Tip>
  Make sure to authenticate the user with their Base Account before creating a Sub Account.
  For that, you can choose one of the following options:

  * Follow the [Authenticate users](/base-account/guides/authenticate-users) guide
  * Simply use `provider.request({ method: 'eth_requestAccounts' });` for a simple wallet connection
</Tip>

Create a Sub Account for your application using the provider's [wallet\_addSubAccount](/base-account/reference/core/provider-rpc-methods/wallet_addSubAccount) RPC method. When no `publicKey` parameter is provided, a non-extractable browser CryptoKey is generated and used to sign on behalf of the Sub Account.

```tsx page.tsx theme={null}
// Create sub account
const subAccount = await provider.request({
  method: 'wallet_addSubAccount',
  params: [
    {
      account: {
        type: 'create',
      },
    }
  ],
});

console.log('Sub Account created:', subAccount.address);
```

Alternatively, you can use the SDK convenience method:

```tsx page.tsx theme={null}
const subAccount = await sdk.subAccount.create();

console.log('Sub Account created:', subAccount.address);
```

This is what the user will see when prompted to create a Sub Account:

<div style={{ display: 'flex', justifyContent: 'center'}}>
  <img src="https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=819bb3e83ec767750090a266bdbdbf86" alt="Sub Account Creation Flow" style={{ width: '300px', height: 'auto' }} data-og-width="532" width="532" data-og-height="875" height="875" data-path="images/base-account/SubAccountCreation.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=280&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=736a456945d68986c38143216bea943f 280w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=560&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=93b013a07bcd5fc33d092ccba145965b 560w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=840&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=c2bea3fc64a0e793e23a202a12a17977 840w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=1100&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=f05e467b70364f3e224a23ca1ae272d7 1100w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=1650&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=cb95b9d0f1f5fcbbb551f2f238eadf9f 1650w, https://mintcdn.com/base-a060aa97/YPpQym_GkqOSL1yD/images/base-account/SubAccountCreation.png?w=2500&fit=max&auto=format&n=YPpQym_GkqOSL1yD&q=85&s=820a2a28f69fddbc4725c1fe500303fe 2500w" />
</div>

### Get Existing Sub Account

Retrieve an existing Sub Account using the provider's [wallet\_getSubAccounts](/base-account/reference/core/provider-rpc-methods/wallet_getSubAccounts) RPC method. This will return the Sub Account associated with the app's domain and is useful to check if a Sub Account already exists for the user to determine if one needs to be created.

```tsx page.tsx theme={null}
// Get the universal account
const [universalAddress] = await provider.request({
  method: "eth_requestAccounts",
  params: []
})

// Get sub account for universal account
const { subAccounts: [subAccount] } = await provider.request({
  method: 'wallet_getSubAccounts',
  params: [{
    account: universalAddress,
    domain: window.location.origin,
  }]
})

if (subAccount) {
  console.log('Sub Account found:', subAccount.address);
} else {
  console.log('No Sub Account exists for this app');
}
```

Alternatively, you can use the SDK convenience method:

```tsx page.tsx theme={null}
const subAccount = await sdk.subAccount.get();

console.log('Sub Account:', subAccount);
```

### Send transactions

To send transactions from the connected sub account you can use EIP-5792 `wallet_sendCalls` or `eth_sendTransaction`. You need to specify the `from` parameter to be the sub account address.

<Tip>
  When the Sub Account is connected, it is the second account in the array returned by `eth_requestAccounts` or `eth_accounts`. `wallet_addSubAccount` needs to be called in each session before the Sub Account can be used. It will not trigger a new Sub Account creation if one already exists.

  If you are using `mode: 'auto'`, the Sub Account will be the first account in the array.
</Tip>

First, get all the