# Base Account Integration

This document describes how BEAT ME integrates the Base Account SDK on Base mainnet.

## Overview

Players connect via the official Base Account UI (`SignInWithBaseButton` from `@base-org/account-ui/react`). The app uses a **singleton SDK instance** shared across hooks and transaction helpers.

Key features:

1. **Sign in with Base** — wallet connect via `hooks/useBaseAccount.ts`
2. **Sub-accounts** — `creation: 'on-connect'`, `defaultAccount: 'sub'` for frictionless game transactions
3. **Base Pay** — `BasePayButton` + `pay()` helper for USDC funding
4. **Gasless transactions** — paymaster via `NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT`
5. **Basenames** — ENSIP-19 resolution via `lib/base-account/basename.ts`
6. **Treasury spend permissions** (optional) — `@base-org/account/spend-permission` when `NEXT_PUBLIC_SPEND_PERMISSION_SPENDER` is set

## Architecture

```
app/rootProvider.tsx
  └── BaseAccountProvider (components/providers/BaseAccountProvider.tsx)
        └── getBaseAccountSDK() singleton (lib/base-account/sdk.ts)
              ├── useBaseAccount hook
              ├── pay() / batch transactions
              └── spend-permission APIs
```

### SDK configuration

Defined in `lib/base-account/sdk.ts` and `lib/base-account/config.ts`:

```typescript
createBaseAccountSDK({
  appName: process.env.NEXT_PUBLIC_BASE_ACCOUNT_APP_NAME || 'BEAT ME',
  appLogoUrl: process.env.NEXT_PUBLIC_BASE_ACCOUNT_LOGO_URL,
  appChainIds: [base.id], // Base mainnet
  subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
  paymasterUrls: [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT],
});
```

### Sub-accounts

On connect, the SDK creates a sub-account automatically. Each session re-activates it via `wallet_addSubAccount` in `lib/base-account/subAccount.ts`.

**Auto Spend (SDK default):** On the first sub-account transaction, Base Account prompts the user to fund from their universal account. Manual auto-spend configuration (`lib/base-account/autoSpend.ts`) is deprecated.

### Base Pay

`@base-org/account-ui` v1.0.1 exposes `BasePayButton` with `onClick` only (no `paymentOptions` prop). Payment flow uses `lib/base-account/pay.ts` (`executeBasePay`) via `hooks/useBasePay.ts`.

Amounts are centralized in `lib/base-account/config.ts` (`BASE_PAY_AMOUNTS`).

### Treasury spend permissions

Separate from sub-account auto-spend. Allows a **server/treasury wallet** to spend user USDC with prior approval.

Requires `NEXT_PUBLIC_SPEND_PERMISSION_SPENDER` (CDP API key wallet address recommended). Optional for v1 — game entry uses user-signed transactions.

Implemented in `lib/base-account/spendPermissions.ts` using `@base-org/account/spend-permission`.

### Basenames

`components/identity/BaseName.tsx` uses `hooks/useBasename.ts`, which resolves `.base.eth` names via viem ENSIP-19 (`coinType` for Base) on Ethereum mainnet.

## Environment Variables

See `docs/ENV_VARIABLES_TEMPLATE.md`. Required for Base Account:

```bash
NEXT_PUBLIC_BASE_ACCOUNT_APP_NAME=BEAT ME
NEXT_PUBLIC_BASE_ACCOUNT_LOGO_URL=https://your-domain.com/logo.png
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/...
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key  # optional, improves basename resolution
NEXT_PUBLIC_SPEND_PERMISSION_SPENDER=0x...  # optional treasury wallet
```

## Dependencies

- `@base-org/account` ^2.5.6 — SDK, pay(), spend-permission
- `@base-org/account-ui` ^1.0.1 — SignInWithBaseButton, BasePayButton
- `viem` — basename resolution, auth verification

## UI components

| Component | Purpose |
|-----------|---------|
| `components/base-account/BaseAccountButton.tsx` | Reusable connect/disconnect |
| `components/wallet/WalletWithBalance.tsx` | Balance + Base Pay |
| `components/game/GamePayment.tsx` | In-game funding |
| `components/base-account/SubAccountDisplay.tsx` | Universal + sub addresses |
| `components/game/SpendPermissionManager.tsx` | Treasury spend permissions |

## Testing

Use `components/base-account/BaseAccountTestSuite.tsx` to verify:

1. SDK initialization and connection
2. Sub-account addresses
3. USDC balance
4. Spend permission status (when spender configured)

Run `npm run build` to catch type errors after SDK updates.

## Out of scope

- **Full SIWB backend** — JWT sessions in `lib/base-account/auth.ts` are stubs; wallet identity is used onchain only
- **OnchainKit wallet connector** — app uses direct Base Account SDK, not wagmi `baseAccount` connector
