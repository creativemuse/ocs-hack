# Foundry Setup Complete ✅

## Summary

Successfully set up Foundry for deploying TriviaBattlev2 smart contract to Base Sepolia and Base Mainnet with automatic verification.

## What Was Installed

### 1. Foundry Tools
- ✅ **forge** v1.4.1-stable - Smart contract compilation and deployment
- ✅ **cast** v1.4.1-stable - Ethereum RPC interactions
- ✅ **anvil** v1.4.1-stable - Local Ethereum node

### 2. Dependencies
- ✅ **OpenZeppelin Contracts** v5.0.0 - Security-audited contract libraries
- ✅ **Chainlink Contracts** v2.9.0 - Automation and oracle functionality
- ✅ **forge-std** - Foundry standard library

### 3. Project Structure

```
ocs-alpha/
├── contracts/
│   ├── TriviaBattle.sol (v1)
│   └── TriviaBattlev2.sol (NEW - with 3% platform fee)
├── script/
│   └── DeployTriviaBattlev2.s.sol (deployment script)
├── lib/
│   ├── forge-std/
│   ├── openzeppelin-contracts/
│   └── chainlink/
├── foundry.toml (configuration)
├── remappings.txt (import paths)
├── deploy-sepolia.sh (testnet deployment)
├── deploy-mainnet.sh (mainnet deployment)
├── env.example (environment template)
├── DEPLOYMENT_QUICKSTART.md (quick guide)
└── docs/
    ├── FOUNDRY_DEPLOYMENT_GUIDE.md (full guide)
    ├── PLATFORM_FEE_IMPLEMENTATION.md (fee details)
    └── FOUNDRY_SETUP_COMPLETE.md (this file)
```

## Contract Changes

### TriviaBattlev2.sol Features
- ✅ 3% platform fee on all entry fees
- ✅ 97% of entry fees go to prize pool
- ✅ Platform fee withdrawal function
- ✅ Updatable platform fee recipient
- ✅ All v1 features maintained
- ✅ Compatible with Chainlink Automation
- ✅ Uses OpenZeppelin v5.0.0

## Deployment Files Created

### 1. Deployment Script
**File**: `script/DeployTriviaBattlev2.s.sol`
- Automatically detects network (Sepolia vs Mainnet)
- Uses correct USDC address per network
- Includes console logging for verification
- Handles constructor arguments

### 2. Shell Scripts
**Files**: `deploy-sepolia.sh`, `deploy-mainnet.sh`
- One-command deployment
- Environment validation
- Compilation check
- Automatic verification
- Safety prompts for mainnet

### 3. Documentation
- **DEPLOYMENT_QUICKSTART.md** - 5-minute quick start
- **FOUNDRY_DEPLOYMENT_GUIDE.md** - Complete deployment guide
- **env.example** - Environment template

## Configuration

### foundry.toml
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"
base_mainnet = "${BASE_MAINNET_RPC_URL}"

[etherscan]
base_sepolia = { key = "${ETHERSCAN_API_KEY}", url = "https://api.etherscan.io/v2/api?chainid=84532" }
base = { key = "${ETHERSCAN_API_KEY}", url = "https://api.etherscan.io/v2/api?chainid=8453" }
```

### remappings.txt
```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
@chainlink/contracts/=lib/chainlink/contracts/
forge-std/=lib/forge-std/src/
```

## Network Details

### Base Sepolia (Testnet)
- **Chain ID**: 84532
- **USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **RPC URL**: `https://sepolia.base.org`
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Base Mainnet
- **Chain ID**: 8453
- **USDC Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **RPC URL**: `https://mainnet.base.org`
- **Explorer**: https://basescan.org

## Quick Start Commands

### Setup
```bash
# Copy environment template
cp env.example .env

# Edit with your values
nano .env
```

### Deploy to Testnet
```bash
./deploy-sepolia.sh
```

### Deploy to Mainnet
```bash
./deploy-mainnet.sh
```

### Manual Commands
```bash
# Compile
forge build

# Test compilation
forge build --contracts contracts/TriviaBattlev2.sol

# Deploy with script
forge script script/DeployTriviaBattlev2.s.sol:DeployTriviaBattlev2 \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

## Environment Variables Required

```bash
PRIVATE_KEY=                    # Deployer wallet (no 0x prefix)
GAME_ORACLE_ADDRESS=            # Backend wallet for rankings
PLATFORM_FEE_RECIPIENT=         # Receives 3% platform fees
BASE_SEPOLIA_RPC_URL=           # https://sepolia.base.org
BASE_MAINNET_RPC_URL=           # https://mainnet.base.org
ETHERSCAN_API_KEY=               # For contract verification
```

## Verification

Contracts are automatically verified during deployment. If verification fails, use manual verification:

```bash
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/TriviaBattlev2.sol:TriviaGame \
    --chain-id 84532 \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" \
        <USDC_ADDRESS> <ORACLE_ADDRESS> <FEE_RECIPIENT_ADDRESS>)
```

## Testing Deployment

```bash
# Read contract info
cast call <CONTRACT_ADDRESS> "ENTRY_FEE()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL
cast call <CONTRACT_ADDRESS> "PLATFORM_FEE_PERCENTAGE()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL

# Create first game (owner only)
cast send <CONTRACT_ADDRESS> "createGame()" \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY
```

## Gas Estimates

| Operation | Gas Used | Cost @ 1 gwei |
|-----------|----------|---------------|
| Deploy | ~3,000,000 | ~0.003 ETH |
| Create Game | ~100,000 | ~0.0001 ETH |
| Enter Game | ~150,000 | ~0.00015 ETH |
| Submit Rankings | ~200,000 | ~0.0002 ETH |
| Finalize Game | ~100,000 | ~0.0001 ETH |
| Claim Prize | ~80,000 | ~0.00008 ETH |
| Withdraw Fees | ~50,000 | ~0.00005 ETH |

## Security Checklist

- [ ] Private key stored securely (never committed)
- [ ] `.env` file in `.gitignore`
- [ ] Oracle address is secure and controlled
- [ ] Platform fee recipient is secure
- [ ] Tested on Sepolia before mainnet
- [ ] Contract verified on Basescan
- [ ] All addresses double-checked
- [ ] Gas price acceptable
- [ ] Sufficient ETH for deployment

## Next Steps

1. **Configure Environment**
   - Copy `env.example` to `.env`
   - Fill in all required values
   - Get Etherscan API v2 key (`ETHERSCAN_API_KEY`)

2. **Test on Sepolia**
   - Run `./deploy-sepolia.sh`
   - Verify contract on Basescan
   - Test all functions
   - Create and complete a test game

3. **Deploy to Mainnet**
   - Double-check all addresses
   - Run `./deploy-mainnet.sh`
   - Verify deployment
   - Update frontend configuration
   - Monitor contract

4. **Post-Deployment**
   - Save contract address
   - Update frontend
   - Test thoroughly
   - Set up monitoring
   - Prepare for first game

## Support Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **Base Docs**: https://docs.base.org/
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/
- **Chainlink**: https://docs.chain.link/
- **Basescan**: https://basescan.org/

## Troubleshooting

See [FOUNDRY_DEPLOYMENT_GUIDE.md](FOUNDRY_DEPLOYMENT_GUIDE.md#troubleshooting) for common issues and solutions.

---

**Setup completed successfully!** 🎉

You're now ready to deploy TriviaBattlev2 to Base Sepolia and Base Mainnet with automatic verification.

