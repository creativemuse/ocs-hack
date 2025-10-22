# Smart Contract Deployment Guide

## Prerequisites

1. **Wallet with ETH**: You need a wallet with some ETH on Base Sepolia for gas fees
2. **Private Key**: Your wallet's private key for deployment
3. **Basescan API Key** (optional): For automatic contract verification

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Your private key for deployment (keep this secret!)
PRIVATE_KEY=your_private_key_here

# Basescan API key for contract verification (optional)
BASESCAN_API_KEY=your_basescan_api_key_here

# Network configuration for frontend
NEXT_PUBLIC_NETWORK=sepolia
```

## Getting Base Sepolia ETH

1. Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Connect your wallet
3. Request test ETH

## Deployment Steps

1. **Compile the contract**:
   ```bash
   npm run compile
   ```

2. **Deploy to Base Sepolia**:
   ```bash
   npm run deploy:sepolia
   ```

3. **Update the contract address**:
   After successful deployment, update `lib/blockchain/contracts.ts` with the deployed contract address.

## Contract Details

- **USDC Address**: `0x036cbd53842c5426634e7929541ec2318f3dcf7e`
- **Entry Fee**: 1 USDC
- **Network**: Base Sepolia (Chain ID: 84532)
- **Features**: Equal Opportunity Prize Pool System

## Testing the Contract

1. **Get USDC**: Use the Base Sepolia USDC faucet or bridge from mainnet
2. **Approve USDC**: Approve the contract to spend your USDC
3. **Join Battle**: Call `joinBattle()` to enter with 1 USDC
4. **Submit Score**: Call `submitScore()` with your game score
5. **Distribute Prizes**: Owner calls `distributePrizes()` after session ends

## Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure
- Test thoroughly on Sepolia before mainnet deployment
- The contract includes emergency withdrawal functions for the owner

## Next Steps

After deployment:
1. Update the contract address in your frontend
2. Test the full game flow
3. Deploy to Base Mainnet when ready for production
