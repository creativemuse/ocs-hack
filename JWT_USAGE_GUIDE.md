# JWT Usage Guide for CDP API

This guide shows you how to use JWT authentication with the Coinbase Developer Platform (CDP) APIs using both simple and advanced approaches.

## 🚀 Quick Start (Simple Approach)

### 1. Set Environment Variables
Create a `.env.local` file with your CDP credentials:

```bash
KEY_NAME=your_cdp_key_name
KEY_SECRET=your_cdp_key_secret
REQUEST_METHOD=POST
REQUEST_HOST=api.cdp.coinbase.com
REQUEST_PATH=/platform/v1/networks/base-mainnet/assets
```

### 2. Generate JWT (Simple Method)
```bash
# Method 1: Using the simple script (follows CDP docs exactly)
npm run jwt-simple

# Method 2: Manual compilation (as shown in CDP docs)
npx tsc main.ts
export JWT=$(node main.js)
echo $JWT
```

### 3. Use JWT in API Calls
```bash
# Test with a CDP API call
curl -L -X POST "https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets/BTC" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

## 🔧 Advanced Approach (Recommended)

### 1. Use the Advanced JWT System
```bash
# Generate JWT with advanced features
npm run generate-jwt

# Test the JWT system
npm run test-jwt
```

### 2. Use in Your Code
```typescript
import { getValidJWT } from '@/lib/apis/cdp';

// In your API route or component
const jwt = await getValidJWT();
const response = await fetch('https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets', {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

## 📋 Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run jwt-simple` | Simple JWT generation (follows CDP docs) | Quick testing, learning |
| `npm run generate-jwt` | Advanced JWT with caching and features | Production use |
| `npm run test-jwt` | Test JWT generation system | Development, debugging |

## 🔍 JWT Token Details

### Token Structure
- **Algorithm**: ES256 (Elliptic Curve Digital Signature)
- **Expiration**: 2 minutes (120 seconds)
- **Issuer**: 'cdp'
- **Subject**: Your CDP key name
- **URI**: Bound to specific API endpoint

### Security Features
- **Nonce**: Random 16-byte nonce for each token
- **Time Validation**: `nbf` (not before) and `exp` (expires) claims
- **URI Binding**: Tokens are tied to specific API endpoints
- **Key ID**: Links token to your specific API key

## 🧪 Testing Your Setup

### 1. Test JWT Generation
```bash
npm run test-jwt
```

### 2. Test with CDP API
```bash
# Generate JWT
npm run generate-jwt

# Use the JWT in a test API call
curl -L -X POST "https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets/BTC" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

### 3. Test One-Click-Buy URLs
For Onramp integration, you can also test One-Click-Buy URLs:

```bash
# Example One-Click-Buy URL
https://pay.coinbase.com/buy?defaultAsset=USDC&fiatCurrency=USD&presetFiatAmount=10&sessionToken=${JWT}
```

## 🔄 Token Renewal

### Automatic Renewal (Advanced System)
The advanced system automatically renews tokens:
- Checks expiration before each API call
- Generates new token when needed
- Caches tokens for efficiency

### Manual Renewal (Simple System)
For the simple system, you need to manually regenerate:
```bash
# Every 2 minutes, run:
npm run jwt-simple
export JWT=$(node main.js)
```

## 🛠️ Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing required environment variables
   ```
   **Solution**: Check your `.env.local` file has all required variables

2. **JWT Expired**
   ```
   Error: JWT token has expired
   ```
   **Solution**: Generate a new JWT (automatic in advanced system)

3. **Invalid Credentials**
   ```
   Error: CDP API authentication failed
   ```
   **Solution**: Verify your CDP API key and secret

### Debug Mode
Enable detailed logging:
```bash
DEBUG=cdp:jwt npm run generate-jwt
```

## 📁 File Structure

```
├── main.ts                          # Simple JWT generator (CDP docs style)
├── lib/cdp/jwt-generator.ts         # Advanced JWT system
├── scripts/generate-jwt.ts          # Advanced JWT script
├── scripts/test-jwt.ts              # JWT testing script
├── scripts/compile-and-run-jwt.sh    # Simple JWT compilation script
└── JWT_USAGE_GUIDE.md               # This guide
```

## 🎯 Next Steps

1. **Choose your approach**:
   - Simple: Use `main.ts` and `npm run jwt-simple`
   - Advanced: Use the full JWT system with `npm run generate-jwt`

2. **Set up environment variables** in `.env.local`

3. **Test your setup** with `npm run test-jwt`

4. **Integrate into your application** using the examples above

5. **Monitor token expiration** and renewal

## 🔗 Related Documentation

- [CDP API Documentation](https://docs.cdp.coinbase.com/)
- [JWT Authentication Guide](https://docs.cdp.coinbase.com/authentication/jwt)
- [Security Best Practices](https://docs.cdp.coinbase.com/security)
- [Onramp Integration Guide](https://docs.cdp.coinbase.com/onramp)
