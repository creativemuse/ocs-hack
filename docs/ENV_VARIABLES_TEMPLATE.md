# Environment Variables Template

This document lists all environment variables needed for this project.

## Foundry / Contract Deployment

Create a `.env` file in the project root with the following variables:

```bash
# Private key for deploying contracts (without 0x prefix)
PRIVATE_KEY=your_64_character_private_key_without_0x

# Contract Addresses (Base Mainnet) — align with chainlink-cre-workflows/weekly-prize-distribution/config.production.json
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913

# SpacetimeDB (production) — see docs/SPACETIMEDB_ENV_SETUP.md
NEXT_PUBLIC_SPACETIME_HOST=https://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIME_MODULE=beat-me
SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_MODULE=beat-me

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

# Base Account Configuration
NEXT_PUBLIC_BASE_ACCOUNT_APP_NAME=BEAT ME
NEXT_PUBLIC_BASE_ACCOUNT_LOGO_URL=https://your-domain.com/logo.png
NEXT_PUBLIC_SPEND_PERMISSION_SPENDER=0xYourTreasuryAddress

# CDP Paymaster & Bundler Endpoint (for gasless transactions)
# Get from: https://portal.cdp.coinbase.com/products/bundler-and-paymaster -> Configuration tab
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/your_key_here

# OnchainKit API Key (for enhanced wallet features) - OPTIONAL with Base Account
NEXT_PUBLIC_CDP_API_KEY=your_onchainkit_api_key
# Legacy name for backward compatibility (deprecated - use NEXT_PUBLIC_CDP_API_KEY)
# NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key

# Environment
NODE_ENV=development

# Blockchain RPC URLs (for contract deployment/testing)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Etherscan API v2 key (Base + other L2s): https://etherscan.io/apidashboard
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

# RPC URLs for Foundry (optional — aliases: BASE_MAINNET_RPC_URL matches deploy scripts)
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

## Chainlink CRE Workflows

Create a `.env` file in `chainlink-cre-workflows/` directory:

```bash
# Private key for CRE workflows (64 characters, no 0x prefix)
CRE_ETH_PRIVATE_KEY=your_64_character_private_key_without_0x
```

## Contract verification API key (Etherscan v2)

Use a single **`ETHERSCAN_API_KEY`** from [etherscan.io/apidashboard](https://etherscan.io/apidashboard). It applies to Base mainnet, Base Sepolia, and other supported chains (no separate Basescan-only variable).

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
