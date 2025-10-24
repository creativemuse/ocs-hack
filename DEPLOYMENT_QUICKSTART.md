# TriviaBattlev2 Deployment Quick Start

## 🚀 Quick Deploy (5 minutes)

### 1. Setup Environment

```bash
# Copy example env file
cp env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required values:**
- `PRIVATE_KEY` - Your wallet private key (needs ETH for gas)
- `GAME_ORACLE_ADDRESS` - Backend wallet that submits rankings
- `PLATFORM_FEE_RECIPIENT` - Wallet that receives 3% platform fees
- `BASESCAN_API_KEY` - Get from [basescan.org/myapikey](https://basescan.org/myapikey)

### 2. Deploy to Testnet

```bash
./deploy-sepolia.sh
```

### 3. Deploy to Mainnet

```bash
./deploy-mainnet.sh
```

## 📋 Pre-Deployment Checklist

- [ ] Foundry installed (`forge --version`)
- [ ] Dependencies installed (OpenZeppelin, Chainlink)
- [ ] `.env` file configured with all required values
- [ ] Deployer wallet has ETH for gas
- [ ] Oracle address is correct and secure
- [ ] Platform fee recipient is correct
- [ ] Basescan API key is valid
- [ ] Contract compiled successfully (`forge build`)
- [ ] Tested on Sepolia before mainnet

## 🔑 Important Addresses

### Base Sepolia (Testnet)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Chain ID**: `84532`
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Base Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Chain ID**: `8453`
- **Explorer**: https://basescan.org

## 💰 Gas Estimates

| Network | Deployment Cost | Approx. USD (at $2500 ETH) |
|---------|----------------|---------------------------|
| Base Sepolia | ~0.003 ETH | ~$7.50 |
| Base Mainnet | ~0.003 ETH | ~$7.50 |

## 🧪 Testing After Deployment

```bash
# Get contract address from deployment output
CONTRACT_ADDRESS=0x...

# Test reading contract
cast call $CONTRACT_ADDRESS "ENTRY_FEE()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL

# Create first game (owner only)
cast send $CONTRACT_ADDRESS "createGame()" \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY
```

## 🔧 Manual Verification (if needed)

```bash
# Base Sepolia
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/TriviaBattlev2.sol:TriviaGame \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" \
        0x036CbD53842c5426634e7929541eC2318f3dCF7e \
        $GAME_ORACLE_ADDRESS \
        $PLATFORM_FEE_RECIPIENT)

# Base Mainnet
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/TriviaBattlev2.sol:TriviaGame \
    --chain-id 8453 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" \
        0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
        $GAME_ORACLE_ADDRESS \
        $PLATFORM_FEE_RECIPIENT)
```

## 📚 Full Documentation

See [FOUNDRY_DEPLOYMENT_GUIDE.md](docs/FOUNDRY_DEPLOYMENT_GUIDE.md) for complete details.

## ⚠️ Security Reminders

1. **Never commit `.env` file** - It contains your private key!
2. **Test on Sepolia first** - Always deploy to testnet before mainnet
3. **Double-check addresses** - Wrong addresses can't be changed after deployment
4. **Secure your oracle** - The oracle address has special privileges
5. **Backup your keys** - Losing your private key means losing access

## 🆘 Common Issues

### "Insufficient funds"
→ Add ETH to your deployer wallet

### "Verification failed"
→ Wait a few minutes and try manual verification

### "Nonce too low"
→ Wait for pending transactions or reset nonce

### "Contract not found"
→ Check you're using the correct RPC URL and chain ID

## 📞 Support

For issues or questions:
1. Check the full deployment guide
2. Review Foundry documentation
3. Verify all environment variables
4. Check Base network status

