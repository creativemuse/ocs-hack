# Environment Variables Template

This document lists all environment variables needed for this project.

## Foundry / Contract Deployment

Create a `.env` file in the project root with the following variables:

```bash
# Private key for deploying contracts (without 0x prefix)
PRIVATE_KEY=your_64_character_private_key_without_0x

<<<<<<< Updated upstream:docs/ENV_VARIABLES_TEMPLATE.md
# Contract Addresses (Base Mainnet)
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913

# SpaceTimeDB Configuration (REQUIRED)
SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_DATABASE=your_database_id
SPACETIME_IDENTITY=your_identity_id
SPACETIME_MODULE=beat-me
SPACETIME_PORT=443

############################################
# CDP API AUTHENTICATION (Choose ONE method)
############################################

# Method 1: Ed25519/RSA (Preferred - New Format)
CDP_API_KEY_NAME=organizations/your-org/apiKeys/your-key
CDP_API_KEY_PRIVATE_KEY=your_private_key_here
CDP_PROJECT_ID=your_project_id

# Method 2: Legacy HMAC (Fallback)
CDP_API_KEY=your_api_key
CDP_API_SECRET=your_api_secret

############################################
# SECURITY & CORS
############################################

# Allowed origins for CORS (comma-separated)
ALLOWED_ORIGINS=https://beatme.creativeplatform.xyz,http://localhost:3000,http://localhost:3001

# Admin API secret key (generate a strong random string)
ADMIN_API_SECRET=your_super_secret_admin_key_here

############################################
# OPTIONAL CONFIGURATION
############################################

# OnchainKit API Key (for enhanced wallet features) - REQUIRED for OnchainKit
NEXT_PUBLIC_CDP_API_KEY=your_onchainkit_api_key
# Legacy name for backward compatibility (deprecated - use NEXT_PUBLIC_CDP_API_KEY)
# NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key

# CDP Paymaster & Bundler Endpoint (for gasless transactions)
# Get from: https://portal.cdp.coinbase.com/products/bundler-and-paymaster -> Configuration tab
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/your_key_here

# Environment
NODE_ENV=development

# Blockchain RPC URLs (for contract deployment/testing)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
PRIVATE_KEY=your_wallet_private_key_for_deployment

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Rate Limiting (Optional - uses default values if not set)
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000

############################################
# WEBHOOK CONFIGURATION (Optional)
############################################

# Webhook secret for signature verification (HMAC SHA-256)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WEBHOOK_SECRET=your_webhook_secret_here

# Webhook provider type: 'coinbase', 'stripe', 'cdp', or 'generic'
# CDP = Coinbase Developer Platform (for blockchain transaction/contract events)
WEBHOOK_PROVIDER=cdp
=======
# Basescan API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key_here

# RPC URLs (optional - defaults in foundry.toml)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
>>>>>>> Stashed changes:ENV_VARIABLES_TEMPLATE.md
```

## Chainlink CRE Workflows

Create a `.env` file in `chainlink-cre-workflows/` directory:

```bash
# Private key for CRE workflows (64 characters, no 0x prefix)
CRE_ETH_PRIVATE_KEY=your_64_character_private_key_without_0x
```

## Getting a Basescan API Key

1. Go to [Basescan](https://basescan.org/)
2. Create an account or log in
3. Navigate to your account settings
4. Go to "API Keys" section
5. Create a new API key
6. Copy the API key and add it to your `.env` file

**Note:** For Base Sepolia, use the same API key from Basescan (it works for both mainnet and testnet).

## Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use different private keys for different purposes (deployment vs CRE workflows)
- ✅ Keep your API keys secure
- ✅ Rotate keys periodically

## Verification

After setting up your `.env` file, verify it's working:

```bash
# Check if variables are loaded (for Foundry)
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia

# This should work without the "environment variable not found" error
```
