# Paymaster Setup Guide

This guide explains how to set up and use the paymaster for gasless transactions in your trivia game.

## Overview

The paymaster integration allows users to interact with your smart contract without paying gas fees. This is particularly useful for:
- Entry fee payments (`joinBattle`)
- USDC approvals for the contract
- Score submissions (`submitScore`)
- Trial battle participation (`joinTrialBattle`)

## Setup Requirements

### 1. OnchainKit Configuration

Make sure your `OnchainKitProvider` is configured with the correct API key and project ID:

```tsx
import { OnchainKitProvider } from '@coinbase/onchainkit';

<OnchainKitProvider
  apiKey={process.env.ONCHAINKIT_API_KEY}
  chain={base}
  projectId={process.env.ONCHAINKIT_PROJECT_ID}
>
  {/* Your app components */}
</OnchainKitProvider>
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
ONCHAINKIT_API_KEY=your_api_key_here
ONCHAINKIT_PROJECT_ID=your_project_id_here
```

### 3. Paymaster Configuration

The paymaster is configured in the contract hooks with these settings:

```typescript
paymasterConfig: {
  type: 'coinbase', // Uses Coinbase's default paymaster for Base
}
```

## Contract Addresses

- **Trivia Contract**: `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a` (Base Mainnet)
- **USDC Contract**: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (Base Mainnet)

## Usage

### Gasless Transactions

The `useTriviaContract` hook now supports gasless transactions by default:

```typescript
// Enable gasless transactions (default)
const { approveUSDC, joinBattle, submitScore } = useTriviaContract(true);

// Use regular transactions (fallback)
const { approveUSDC, joinBattle, submitScore } = useTriviaContract(false);
```

### Transaction Flow

1. **USDC Approval**: Gasless approval of USDC spending for the trivia contract
2. **Join Battle**: Gasless entry into the trivia battle
3. **Score Submission**: Gasless submission of game scores
4. **Prize Distribution**: Admin function (not gasless by default)

### Supported Functions

All major contract functions support gasless transactions:

- `approveUSDC()` - Approve USDC spending
- `joinBattle()` - Join paid trivia battle
- `joinTrialBattle(sessionId)` - Join trial battle
- `submitScore(score)` - Submit game score
- `submitTrialScore(sessionId, score)` - Submit trial score

## Error Handling

The hooks handle both gasless and regular transaction errors:

```typescript
const { error, isApproving, isJoining } = useTriviaContract(true);

if (error) {
  console.error('Transaction failed:', error);
  // Handle error appropriately
}
```

## Testing

### Test Gasless Transactions

1. Connect a wallet with USDC balance
2. Try to join a paid battle
3. Verify that no gas fees are charged
4. Check transaction receipt for paymaster sponsorship

### Fallback to Regular Transactions

If gasless transactions fail, you can fallback to regular transactions:

```typescript
const { approveUSDC, joinBattle } = useTriviaContract(false); // Regular transactions
```

## Troubleshooting

### Common Issues

1. **API Key Missing**: Ensure `ONCHAINKIT_API_KEY` is set
2. **Project ID Missing**: Ensure `ONCHAINKIT_PROJECT_ID` is set
3. **Contract Not Allowed**: Configure contract allowlist in Coinbase Developer Platform
4. **Insufficient Paymaster Balance**: Top up your paymaster account

### Debug Mode

Enable debug logging by checking browser console for transaction details:

```typescript
console.log('Transaction sent successfully:', hash);
console.error('Transaction failed:', error);
```

## Security Considerations

1. **Contract Allowlist**: Configure which contracts can use your paymaster
2. **Spending Limits**: Set appropriate limits to prevent abuse
3. **User Authentication**: Ensure only authenticated users can trigger gasless transactions
4. **Rate Limiting**: Consider implementing rate limits for paymaster usage

## Monitoring

Monitor your paymaster usage through:
- Coinbase Developer Platform dashboard
- Transaction receipts showing paymaster sponsorship
- Gas usage analytics
- User feedback on transaction experience

## Support

For issues with the paymaster integration:
1. Check Coinbase Developer Platform documentation
2. Verify contract configuration
3. Test with regular transactions as fallback
4. Contact Coinbase support for paymaster-specific issues
