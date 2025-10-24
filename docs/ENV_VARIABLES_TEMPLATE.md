# Environment Variables Template

Copy this to `.env.local` and fill in your values:

```bash
############################################
# REQUIRED ENVIRONMENT VARIABLES
############################################

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
PRIVATE_KEY=your_wallet_private_key_for_deployment

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Rate Limiting (Optional - uses default values if not set)
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

## Generating Secure Secrets

Generate `ADMIN_API_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Vercel Deployment

Set all required variables in your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable from the REQUIRED section above
3. Set `NODE_ENV=production`
4. Update `ALLOWED_ORIGINS` with your production domain

