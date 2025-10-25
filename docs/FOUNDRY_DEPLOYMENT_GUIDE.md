# TriviaBattlev2 Foundry Deployment Guide

This guide covers deploying and verifying the TriviaBattlev2 smart contract on Base Sepolia (testnet) and Base Mainnet using Foundry.

## Prerequisites

1. **Foundry Installed** ✅ (Already installed)
2. **Dependencies Installed** ✅ (OpenZeppelin v5.0.0 and Chainlink v2.9.0)
3. **Environment Variables Set Up** (See below)
4. **Basescan API Key** (For contract verification)
5. **Private Key with Funds** (ETH for gas on respective networks)

## Environment Setup

Create a `.env` file in the project root with the following variables:

```bash
# Deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Game oracle address (backend wallet that submits rankings)
GAME_ORACLE_ADDRESS=0x...

# Platform fee recipient address (receives 3% platform fees)
PLATFORM_FEE_RECIPIENT=0x...

# RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Basescan API key for verification
BASESCAN_API_KEY=your_basescan_api_key

# Optional: Etherscan API key (if using Etherscan instead)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Getting a Basescan API Key

1. Go to [Basescan](https://basescan.org/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### Important Addresses

#### Base Sepolia (Testnet)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Chain ID**: `84532`
- **RPC**: `https://sepolia.base.org`
- **Explorer**: `https://sepolia.basescan.org`

#### Base Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Chain ID**: `8453`
- **RPC**: `https://mainnet.base.org`
- **Explorer**: `https://basescan.org`

## Deployment Steps

### 1. Load Environment Variables

```bash
source .env
```

### 2. Compile the Contract

```bash
forge build
```

Expected output:
```
Compiler run successful!
```

### 3. Deploy to Base Sepolia (Testnet)

```bash
forge script script/DeployTriviaBattlev2.s.sol:DeployTriviaBattlev2 \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv
```

**Flags Explained:**
- `--rpc-url`: Specifies the network RPC endpoint
- `--broadcast`: Actually sends the transactions (remove for dry run)
- `--verify`: Automatically verifies the contract on Basescan
- `--etherscan-api-key`: API key for verification
- `-vvvv`: Very verbose output for debugging

### 4. Deploy to Base Mainnet (Production)

⚠️ **WARNING**: This deploys to mainnet and costs real money!

```bash
forge script script/DeployTriviaBattlev2.s.sol:DeployTriviaBattlev2 \
    --rpc-url $BASE_MAINNET_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv
```

### 5. Save Deployment Information

After deployment, save the contract address from the output:

```
TriviaGame deployed at: 0x...
```

Update your application's configuration with this address.

## Manual Verification (If Auto-Verification Fails)

If automatic verification fails, you can verify manually:

### Base Sepolia

```bash
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/TriviaBattlev2.sol:TriviaGame \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" <USDC_ADDRESS> <ORACLE_ADDRESS> <FEE_RECIPIENT_ADDRESS>)
```

### Base Mainnet

```bash
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/TriviaBattlev2.sol:TriviaGame \
    --chain-id 8453 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" <USDC_ADDRESS> <ORACLE_ADDRESS> <FEE_RECIPIENT_ADDRESS>)
```

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on Basescan
- [ ] Save contract address
- [ ] Test contract on block explorer
- [ ] Update frontend with new contract address
- [ ] Test `createGame()` function (owner only)
- [ ] Test `enterGame()` function
- [ ] Verify platform fee recipient can withdraw fees
- [ ] Update oracle backend with new contract address

## Testing Deployment

### Read Contract Information

```bash
# Get entry fee
cast call <CONTRACT_ADDRESS> "ENTRY_FEE()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL

# Get platform fee percentage
cast call <CONTRACT_ADDRESS> "PLATFORM_FEE_PERCENTAGE()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL

# Get current game ID
cast call <CONTRACT_ADDRESS> "currentGameId()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL
```

### Create First Game (Owner Only)

```bash
cast send <CONTRACT_ADDRESS> \
    "createGame()" \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY
```

## Troubleshooting

### Issue: "Insufficient funds"
**Solution**: Ensure your deployer wallet has enough ETH for gas fees
- Base Sepolia: Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- Base Mainnet: Ensure you have real ETH

### Issue: "Verification failed"
**Solution**: 
1. Check your Basescan API key is correct
2. Wait a few minutes and try manual verification
3. Ensure you're using the correct chain ID

### Issue: "Nonce too low"
**Solution**: Reset your account nonce or wait for pending transactions to complete

### Issue: "Contract creation code storage out of gas"
**Solution**: Increase gas limit in foundry.toml or use `--gas-limit` flag

## Gas Estimates

Approximate gas costs (at 1 gwei):

| Operation | Gas Used | Cost (ETH) |
|-----------|----------|------------|
| Deploy Contract | ~3,000,000 | ~0.003 |
| Create Game | ~100,000 | ~0.0001 |
| Enter Game | ~150,000 | ~0.00015 |
| Submit Rankings | ~200,000 | ~0.0002 |
| Finalize Game | ~100,000 | ~0.0001 |
| Claim Prize | ~80,000 | ~0.00008 |

## Security Considerations

1. **Private Key Security**: Never commit your `.env` file or private key
2. **Oracle Address**: Ensure the oracle address is secure and controlled
3. **Platform Fee Recipient**: Use a secure wallet for fee collection
4. **Test First**: Always deploy to testnet before mainnet
5. **Audit**: Consider getting a security audit before mainnet deployment

## Updating the Contract

If you need to update the contract:

1. Deploy a new version with a different name (e.g., `TriviaBattlev3`)
2. Migrate any necessary data
3. Update frontend to point to new contract
4. Ensure old contract is properly finalized

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Base Documentation](https://docs.base.org/)
- [Basescan](https://basescan.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Chainlink Automation](https://docs.chain.link/chainlink-automation)

## Support

If you encounter issues:
1. Check the Foundry documentation
2. Review Base network status
3. Verify all environment variables are set correctly
4. Check gas prices and ensure sufficient funds

