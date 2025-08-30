# 🚀 Smart Contract Deployment Instructions

## ✅ Contract Compiled Successfully!

The TriviaBattle smart contract has been compiled and is ready for deployment to Base Sepolia.

## 📋 Prerequisites

1. **Wallet with ETH**: You need a wallet with some ETH on Base Sepolia for gas fees
2. **Private Key**: Your wallet's private key for deployment
3. **Basescan API Key** (optional): For automatic contract verification

## 🔧 Environment Setup

Create a `.env` file in the root directory:

```bash
# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Your private key for deployment (keep this secret!)
PRIVATE_KEY=your_private_key_here

# Basescan API key for contract verification (optional)
BASESCAN_API_KEY=your_basescan_api_key_here
```

## 💰 Get Base Sepolia ETH

1. Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Connect your wallet
3. Request test ETH

## 🚀 Deploy the Contract

Run the deployment command:

```bash
npm run deploy:sepolia
```

## 📊 Contract Details

- **USDC Address**: `0x036cbd53842c5426634e7929541ec2318f3dcf7e`
- **Entry Fee**: 1 USDC
- **Network**: Base Sepolia (Chain ID: 84532)
- **Features**: Equal Opportunity Prize Pool System

## 🔄 After Deployment

1. **Update Contract Address**: Update `lib/blockchain/contracts.ts` with the deployed contract address
2. **Test the Contract**: Use the Base Sepolia USDC faucet to test the game flow
3. **Verify on Basescan**: The contract will be automatically verified if you provided an API key

## 🎮 Testing the Contract

1. **Get USDC**: Use the Base Sepolia USDC faucet
2. **Approve USDC**: Approve the contract to spend your USDC
3. **Join Battle**: Call `joinBattle()` to enter with 1 USDC
4. **Submit Score**: Call `submitScore()` with your game score
5. **Distribute Prizes**: Owner calls `distributePrizes()` after session ends

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure
- Test thoroughly on Sepolia before mainnet deployment
- The contract includes emergency withdrawal functions for the owner

## 📝 Next Steps

After deployment:
1. Update the contract address in your frontend
2. Test the full game flow
3. Deploy to Base Mainnet when ready for production

---

**Ready to deploy? Run `npm run deploy:sepolia` after setting up your `.env` file!**
