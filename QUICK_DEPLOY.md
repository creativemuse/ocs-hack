# Quick Deployment Guide

## Prerequisites

1. Set your private key in `.env`:
```bash
PRIVATE_KEY=your_private_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. Ensure you have ETH on the target network:
   - **Base Sepolia**: Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - **Base Mainnet**: Ensure you have ETH in your wallet

3. Check your balance:
```bash
# Check Base Sepolia balance
cast balance <YOUR_ADDRESS> --rpc-url base_sepolia

# Check Base Mainnet balance  
cast balance <YOUR_ADDRESS> --rpc-url base_mainnet
```

**Note:** You need at least 0.00001 ETH for deployment gas fees.

## Deploy to Base Sepolia (Testnet)

```bash
# Simulate deployment (dry run)
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia

# Deploy and verify
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

## Deploy to Base Mainnet

```bash
# Simulate deployment (dry run)
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet

# Deploy and verify
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

## After Deployment

1. Save the contract address from the deployment output
2. Update `lib/blockchain/contracts.ts` with the new address
3. Update Chainlink addresses if needed:
   ```bash
   cast send <CONTRACT_ADDRESS> "setChainlinkOracle(address)" <ORACLE_ADDRESS> \
     --rpc-url base_sepolia \
     --private-key $PRIVATE_KEY
   ```

## Configuration

The contract is deployed with:
- **Session Interval**: 1 week (604800 seconds)
- **Entry Fee**: 1 USDC (1e6)
- **Prize Percentage**: 80%

See `DEPLOYMENT_INSTRUCTIONS.md` for detailed instructions.
