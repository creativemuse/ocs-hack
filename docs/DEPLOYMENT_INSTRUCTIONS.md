# TriviaBattle Deployment Instructions

This guide explains how to deploy the TriviaBattle contract to Base Sepolia (testnet) and Base Mainnet using Foundry.

## Prerequisites

1. **Foundry installed** - Already installed ✓
2. **Private key** - Your deployer wallet's private key
3. **Base Sepolia ETH** - For testnet deployment (get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
4. **Base Mainnet ETH** - For mainnet deployment
5. **Etherscan API v2 key** (`ETHERSCAN_API_KEY`) — [apidashboard](https://etherscan.io/apidashboard)

## Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional - defaults are set in foundry.toml)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Etherscan API Key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**⚠️ Security Note:** Never commit your `.env` file. It's already in `.gitignore`.

### 2. Network Addresses

The deployment script uses the following addresses:

**Base Sepolia:**
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- LINK: `0xE4aB69C077896252FAFBD49EFD26B5D171A32410`

**Base Mainnet:**
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- LINK: `0x88DfaAABaf06f3a41D260BEA10568C1b4794334c`

**Chainlink Functions:** Currently set to `address(0)`. Update these addresses in `script/DeployTriviaBattle.s.sol` when Chainlink Functions is configured.

## Deployment Configuration

The contract is deployed with these parameters:
- **Session Interval:** 1 week (604800 seconds)
- **Entry Fee:** 1 USDC (1e6, since USDC has 6 decimals)
- **Prize Percentage:** 80% (80% of prize pool goes to winners)

## Deploy to Base Sepolia (Testnet)

### Step 1: Test the deployment (simulation)

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

This simulates the deployment without actually deploying.

### Step 2: Deploy to Base Sepolia

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

This will:
1. Deploy the contract
2. Broadcast the transaction
3. Verify the contract on Basescan

### Step 3: Save deployment information

After deployment, save the contract address and update your configuration files.

## Deploy to Base Mainnet

**⚠️ Important:** Only deploy to mainnet after thorough testing on Sepolia!

### Step 1: Test the deployment (simulation)

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

### Step 2: Deploy to Base Mainnet

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Alternative: Using Foundry Keystore (More Secure)

Instead of using `PRIVATE_KEY` environment variable, you can use Foundry's keystore:

### 1. Import your private key

```bash
cast wallet import deployer --interactive
```

Enter your private key when prompted and set a password.

### 2. Deploy using the keystore

```bash
# Base Sepolia
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia \
  --account deployer \
  --broadcast \
  --verify

# Base Mainnet
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --account deployer \
  --broadcast \
  --verify
```

## Post-Deployment Steps

### 1. Update Configuration

After deployment, update your application configuration with the new contract address:

- Update `lib/blockchain/contracts.ts` with the new contract address
- Update environment variables if needed

### 2. Verify Contract Functions

Test the deployed contract:

```bash
# Check owner
cast call <CONTRACT_ADDRESS> "owner()" --rpc-url base_sepolia

# Check USDC token address
cast call <CONTRACT_ADDRESS> "USDC_TOKEN()" --rpc-url base_sepolia

# Check entry fee
cast call <CONTRACT_ADDRESS> "entryFee()" --rpc-url base_sepolia
```

### 3. Update Chainlink Addresses (if needed)

If you need to set Chainlink Functions addresses after deployment:

```bash
cast send <CONTRACT_ADDRESS> "setChainlinkOracle(address)" <ORACLE_ADDRESS> \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

### 4. Start First Session

```bash
cast send <CONTRACT_ADDRESS> "startNewSession()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

## Troubleshooting

### Error: "Insufficient funds"
- Make sure your wallet has enough ETH for gas fees
- Base Sepolia: Get testnet ETH from faucet
- Base Mainnet: Ensure you have ETH in your wallet

### Error: "Contract verification failed"
- Check that `ETHERSCAN_API_KEY` is set correctly
- Wait a few minutes after deployment before verifying
- Try manual verification on Basescan

### Error: "Unsupported network"
- Ensure you're using the correct RPC URL
- Check that the chain ID matches (84532 for Sepolia, 8453 for Mainnet)

## Contract Verification

If automatic verification fails, you can verify manually:

```bash
forge verify-contract \
  --chain-id 84532 \
  --num-of-optimizations 200 \
  --watch \
  <CONTRACT_ADDRESS> \
  contracts/TriviaBattle.sol:TriviaBattle \
  <ETHERSCAN_API_KEY> \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint256,uint256,uint256)" <USDC> <LINK> <CHAINLINK_FUNCTIONS> <CHAINLINK_ORACLE> 604800 1000000 80)
```

## Deployment Checklist

- [ ] Environment variables set up
- [ ] Private key secured (keystore or .env)
- [ ] Tested on Base Sepolia
- [ ] Contract verified on Basescan
- [ ] Configuration files updated
- [ ] Chainlink addresses updated (if needed)
- [ ] First session started
- [ ] Ready for production (Base Mainnet)

## Support

For issues or questions:
- Check [Base Documentation](https://docs.base.org)
- Check [Foundry Documentation](https://book.getfoundry.sh)
- Review contract code in `contracts/TriviaBattle.sol`
