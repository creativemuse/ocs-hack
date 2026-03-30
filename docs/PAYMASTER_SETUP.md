# Paymaster Setup Guide

This guide explains how to set up Coinbase Paymaster for gas sponsorship in your trivia game.

## 1. Register Paymaster Service

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/paymaster/)
2. Register your project to get:
   - Paymaster & Bundler endpoint: `https://api.developer.coinbase.com/rpc/v1/base/${YOUR_API_KEY}`

## 2. Enable Paymaster

Register your contracts and functions that will be sponsored:

**Name:** TriviaBattle  
**Contract Address:** `0x83514843b0A11398e98e99873908c1d6f1C1CaeA` (replace with your actual contract address)  
**Functions:** 
- `joinBattle()`
- `approve(address,uint256)` (for USDC approval)

## 3. Environment Variables

Add these to your `.env.local` file:

```bash
# CDP API Key for Paymaster
NEXT_PUBLIC_CDP_API_KEY=your_cdp_api_key_here

# Contract addresses
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0x83514843b0A11398e98e99873908c1d6f1C1CaeA
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
```

## 4. How It Works

### Smart Account (Gasless)
- Uses `useWriteContracts` with paymaster capabilities
- Gas is sponsored by Coinbase
- Transactions are bundled and processed through the paymaster

### EOA Account (Gas Required)
- Uses standard `useWriteContract`
- User pays their own gas fees
- Standard Ethereum transaction flow

## 5. Account Detection

The system automatically detects account capabilities:

```typescript
const capabilities = useAccountCapabilities();
const isSmartAccount = !!capabilities?.paymasterService;
```

## 6. Transaction Flow

1. **Smart Account**: Calls `joinGameUniversal()` → Uses paymaster → Gasless transaction
2. **EOA Account**: Calls `joinGameUniversal()` → Standard transaction → User pays gas

## 7. Benefits

- **Smart Account Users**: Completely gasless experience
- **EOA Users**: Standard transaction flow (still works)
- **Automatic Detection**: No manual configuration needed
- **Fallback Support**: Works with both account types

## 8. Troubleshooting

### Common Issues

1. **Paymaster Rejection**: Check contract allowlist in CDP Dashboard
2. **Empty Error Objects**: Usually indicates paymaster/bundler issues
3. **Capability Detection**: Ensure wallet supports paymaster service

### Debug Information

The component shows:
- Account type (Smart Account vs EOA)
- Gas sponsorship status
- Transaction processing state

## 9. Testing

1. **Smart Account**: Use Coinbase Smart Wallet (keys.coinbase.com)
2. **EOA**: Use MetaMask or standard wallet
3. **Both**: Test with different wallet types to verify fallback

## 10. Production Considerations

- Set up proper contract allowlist in CDP Dashboard
- Monitor paymaster usage and costs
- Consider rate limiting for production use
- Test thoroughly with both account types