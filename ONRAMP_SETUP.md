# Coinbase Onramp One-Click-Buy Integration Guide

## Overview

This project integrates Coinbase Onramp's One-Click-Buy URL functionality to enable seamless USDC funding on the Base network. Users can purchase $5 USDC with their debit card or Apple Pay directly from the wallet interface.

## Features

- **One-Click-Buy URLs**: Pre-filled onramp URLs that take users directly to the payment screen
- **$2 USDC Default**: Optimized for the game's 1 USDC entry fee
- **Base Network**: All transactions occur on Base for low fees
- **Apple Pay Support**: Automatic Apple Pay detection for compatible devices
- **Card Payments**: Standard debit card payments for all users

## Architecture

### API Endpoints

#### `/api/buy-quote` (POST)
Generates a one-click-buy URL with quote information.

**Request:**
```json
{
  "walletAddress": "0x...",
  "paymentAmount": "2.00",
  "paymentCurrency": "USD",
  "purchaseCurrency": "USDC",
  "purchaseNetwork": "base",
  "paymentMethod": "CARD",
  "country": "US"
}
```

**Response:**
```json
{
  "onrampUrl": "https://pay.coinbase.com/buy/select-asset?...",
  "quoteId": "...",
  "purchaseAmount": {
    "amount": "4.95",
    "currency": "USDC"
  },
  "paymentTotal": {
    "amount": "5.00",
    "currency": "USD"
  },
  "coinbaseFee": {
    "amount": "0.05",
    "currency": "USD"
  }
}
```

### Utility Functions

#### `generateOneClickBuyUrl(walletAddress, options?)`
Located in: `lib/utils/funding.ts`

Calls the buy quote API and returns a ready-to-use onramp URL.

**Default Options:**
- `paymentAmount`: "5.00"
- `paymentCurrency`: "USD"
- `purchaseCurrency`: "USDC"
- `purchaseNetwork`: "base"
- `paymentMethod`: "CARD"
- `country`: "US"

### Custom Hook

#### `useOneClickBuy()`
Located in: `hooks/useOneClickBuy.ts`

React hook for managing onramp flow in components.

**Returns:**
- `generateBuyUrl`: Function to generate the buy URL
- `openOnramp`: Function to open URL in popup window
- `isLoading`: Loading state
- `error`: Error message if any
- `quoteData`: Quote information including fees
- `clearError`: Function to clear error state

## Required Environment Variables

```bash
# CDP API Credentials (Required)
CDP_API_KEY_NAME=your_cdp_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
CDP_PROJECT_ID=your_project_id

# Alternative: Legacy credentials
CDP_API_KEY=your_api_key
CDP_API_SECRET=your_api_secret
```

## Usage in Components

### WalletWithBalance Component

The "Add USDC Funds" button in the wallet dropdown uses the One-Click-Buy flow:

```typescript
const { generateBuyUrl, openOnramp, isLoading, error } = useOneClickBuy();

const handleAddFunds = async () => {
  const result = await generateBuyUrl(address, {
    paymentAmount: '5.00',
    paymentCurrency: 'USD',
    purchaseCurrency: 'USDC',
    purchaseNetwork: 'base',
    paymentMethod: 'CARD',
    country: 'US',
  });
  
  if (result?.url) {
    openOnramp(result.url);
  }
};
```

### WalletFunding Component

Standalone funding component with quote preview:

```typescript
const { generateBuyUrl, openOnramp, quoteData } = useOneClickBuy();

const handleFundWallet = async () => {
  const result = await generateBuyUrl(address);
  if (result?.url) {
    setShowQuote(true);
    setTimeout(() => openOnramp(result.url), 500);
  }
};
```

## Payment Methods

### Supported Methods

| Method | Description | Availability |
|--------|-------------|--------------|
| `CARD` | Standard debit card | All users |
| `APPLE_PAY` | Apple Pay (automatic detection) | iOS/macOS with Apple Pay |
| `GUEST_CHECKOUT_CARD` | Guest debit card checkout | US users |
| `GUEST_CHECKOUT_APPLE_PAY` | Guest Apple Pay | US users |
| `ACH_BANK_ACCOUNT` | Bank account transfer | Coinbase users |
| `CRYPTO_ACCOUNT` | From Coinbase wallet | Coinbase users |

### Default Payment Method

The integration defaults to `CARD` which:
- Works for all web browsers
- Automatically upgrades to Apple Pay when available
- Supports guest checkout (no Coinbase account needed)

## Testing

### Development Testing

1. Use the buy quote API to generate a URL
2. Open the URL in a browser
3. Test with Coinbase sandbox credentials (if available)

### Production Testing

1. Test with small amounts ($5-$10)
2. Verify wallet receives USDC on Base network
3. Check transaction appears in Coinbase Onramp dashboard

### Common Issues

**Issue**: "No onramp URL returned"
- Check CDP API credentials are set correctly
- Verify wallet address is valid
- Check network connectivity

**Issue**: "Popup blocked"
- Browser popup blocker is active
- URL will open in new tab as fallback

**Issue**: "Payment declined"
- User's card declined by bank
- Insufficient funds
- Card doesn't support online purchases

## Security Considerations

### JWT Authentication

The buy quote API uses JWT authentication with the CDP API:
- JWTs expire after 2 minutes
- Generated server-side to protect API secrets
- Never exposed to client-side code

### User Data Protection

- Wallet addresses passed via API body (not URL params)
- No sensitive user data stored client-side
- Payment handled entirely by Coinbase

### CORS Protection

The buy quote API endpoint includes CORS protection:
- Only allowed origins can call the API
- Production domain must be whitelisted

## URL Parameters

### One-Click-Buy URL Format

According to [Coinbase Documentation](https://docs.cdp.coinbase.com/onramp-offramp/docs/api-configurations#one-click-buy-onramp-url), One-Click-Buy URLs must include:
- `sessionToken` (contains wallet addresses)
- `defaultAsset` (specific crypto to buy)
- `presetFiatAmount` + `fiatCurrency` OR `presetCryptoAmount`

```
https://pay.coinbase.com/buy?
  sessionToken=<token>&
  defaultAsset=USDC&
  fiatCurrency=USD&
  presetFiatAmount=10&
  defaultPaymentMethod=CARD&
  defaultNetwork=base
```

### Available Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sessionToken` | Authentication token (includes addresses) | Generated server-side |
| `defaultAsset` | Crypto asset to purchase | USDC |
| `fiatCurrency` | Fiat currency (required with presetFiatAmount) | USD |
| `presetFiatAmount` | Fiat amount in dollars | 10.00 |
| `defaultNetwork` | Blockchain network | base |
| `defaultPaymentMethod` | Payment type (CARD auto-upgrades to Apple Pay) | CARD |

## Customization

### Change Default Amount

Edit the default in `generateOneClickBuyUrl`:

```typescript
const defaultOptions = {
  paymentAmount: '10.00', // Change from 5.00 to 10.00
  // ...
};
```

### Add Multiple Presets

Create preset functions:

```typescript
export const FUNDING_PRESETS = {
  small: { paymentAmount: '5.00' },
  medium: { paymentAmount: '10.00' },
  large: { paymentAmount: '25.00' },
};

const result = await generateBuyUrl(address, FUNDING_PRESETS.medium);
```

### Support Multiple Assets

Update the buy quote request:

```typescript
const result = await generateBuyUrl(address, {
  purchaseCurrency: 'ETH', // Change from USDC to ETH
  purchaseNetwork: 'base',
  // ...
});
```

## Monitoring & Analytics

### Transaction Status

Track onramp transactions using the Coinbase Onramp dashboard:
1. Log in to CDP portal
2. Navigate to Onramp section
3. View transaction history

### Quote Analytics

Log quote data for analytics:

```typescript
const result = await generateBuyUrl(address);
if (result?.quote) {
  console.log('Quote generated:', {
    amount: result.quote.purchaseAmount,
    fees: result.quote.coinbaseFee,
    quoteId: result.quoteId,
  });
}
```

## Support & Resources

- [Coinbase Onramp Documentation](https://docs.cdp.coinbase.com/onramp-offramp/)
- [CDP Discord #onramp](https://discord.com/invite/cdp)
- [Buy Quote API Reference](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-buy-quote)
- [Payment Methods Guide](https://docs.cdp.coinbase.com/onramp-offramp/developer-guidance/payment-methods)

## Troubleshooting

### Debug Mode

Enable detailed logging:

```typescript
const result = await generateBuyUrl(address, options);
console.log('Buy URL Result:', result);
console.log('Quote Data:', result.quote);
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "walletAddress is required" | Missing address | Ensure wallet is connected |
| "Server configuration error" | Missing API keys | Check environment variables |
| "Failed to create buy quote" | API error | Check CDP API status |
| "No onramp URL returned" | Response missing URL | Verify destination address is valid |

## Changelog

### v1.0.0 (Current)
- Initial One-Click-Buy integration
- $5 USDC preset on Base network
- Support for CARD and APPLE_PAY
- Integration in WalletWithBalance and WalletFunding components

