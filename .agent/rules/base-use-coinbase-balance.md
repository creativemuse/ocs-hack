---
trigger: model_decision
description: How to use Coinbase balances onchain with Base Account
---

# Use Coinbase Balances Onchain

> How to use Coinbase balances onchain with Base Account

With MagicSpend, Base Account users can use their Coinbase balances onchain. This means users can easily start using onchain apps without needing to onramp funds into their wallet.

This also means that apps might not have all the balance information typically available to them by reading onchain data. Base Account indicates that this is the case by responding to [`wallet_getCapabilities` RPC calls](https://eip5792.xyz/reference/getCapabilities) with the `auxiliaryFunds` capability for each chain Base Account users can use their Coinbase balances on.

If your app supports Base Account, it should not assume it knows the full balances available to a user if the `auxiliaryFunds` capability is present on a given chain. For example, if your app disables a transaction button if it sees that the wallet has insufficient funds, your app should take `auxiliaryFunds` into account and enable the button if the account has `auxiliaryFunds` on the chain the user is transacting on.

## Why it matters

MagicSpend makes onboarding smoother by letting users pay gas or send funds even when their onchain wallet balance is **zero**. Your interface should therefore *never* disable an action just because the onchain balance is insufficient.

1. Ensure you have the user’s `address` stored in your component state (from your wallet connection flow).

2. Drop the component below into your UI. It will check whether MagicSpend (`auxiliaryFunds`) is available for that address on Base and if not, disable the send button accordingly.

```tsx title="SendButton.tsx" theme={null}
import { useEffect, useState } from "react";
import { createBaseAccountSDK, base } from "@base-org/account";

const sdk = createBaseAccountSDK({
  appName: "Magic Spend Demo",
  appLogoUrl: "https://base.org/logo.png",
  appChainIds: [base.constants.CHAIN_IDS.base],
});

const provider = sdk.getProvider();

interface Props {
  address?: string; // wallet address from your app state
}

export function SendButton({ address }: Props) {
  const [hasAuxFunds, setHasAuxFunds] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address) return; // Wallet not connected yet

    (async () => {
      try {
        const capabilities = await provider.request({
          method: "wallet_getCapabilities",
          params: [address],
        });
        const supported =
          capabilities?.[base.constants.CHAIN_IDS.base]?.auxiliaryFunds
            ?.supported ?? false;
        setHasAuxFunds(supported);
      } catch (err) {
        console.error("wallet_getCapabilities failed", err);
        setHasAuxFunds(false);
      }
    })();
  }, [address]);

  const disabled = hasAuxFunds !== true;

  return (
    <button disabled={disabled} onClick={() => console.log("Send!")}>
      {hasAuxFunds ? "Send Transaction" : "Insufficient Balance"}
    </button>
  );
}
```

### What the code does

1. Receives the current `address` from your own wallet logic.
2. Calls `wallet_getCapabilities` whenever the address changes.
3. Reads `auxiliaryFunds.supported` for the Base chain (`8453`).
4. Enables the button when MagicSpend is available; otherwise shows “Insufficient Balance”.

## Base Pay integrates Magic Spend by default

Thanks to [Magic Spend](/base-account/improve-ux/magic-spend), [Base Pay](/base-account/guides/accept-payments) allows users to pay with their USDC balance on Coinbase by default.

<div style={{ display: 'flex', justifyContent: 'center' }}>
  <img src="https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=22290500142458e9a733e2978f988c7a" alt="Pay with Coinbase on Base Account" style={{ width: '300px', height: 'auto' }} data-og-width="451" width="451" data-og-height="728" height="728" data-path="images/base-account/CoinbaseSpend.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=280&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=cfadd5d81983e453a1e69ee7fd12d14d 280w, https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=560&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=86f2312a014540b8d6cd9b04e1f02327 560w, https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=840&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=0cb583d4ac056960c92353754b0d97bf 840w, https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=1100&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=17d5977a6a52235b9a3b5cab6edac963 1100w, https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=1650&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=b3fadbc728c981c57b01150e422a5ef3 1650w, https://mintcdn.com/base-a060aa97/zJDlWs-ElgNXh0g7/images/base-account/CoinbaseSpend.png?w=2500&fit=max&auto=format&n=zJDlWs-ElgNXh0g7&q=85&s=e1513f16669b04ff394bb8c52eca53b3 2500w" />
</div>

***

## Next steps

* Handle loading/error states if you need fine-grained UX
* Combine this check with your existing onchain balance logic for fallback flows
