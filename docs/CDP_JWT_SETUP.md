# CDP JWT Authentication Setup Guide

## Overview
This guide will help you set up JWT authentication for the Coinbase Developer Platform (CDP) APIs in your project.

## Prerequisites
- CDP API credentials (Key Name and Key Secret)
- Node.js and npm installed
- Your project dependencies installed

## Setup Steps

### 1. Environment Variables
Create a `.env.local` file in your project root with the following variables:

```bash
# CDP API Configuration
KEY_NAME=your_cdp_key_name_here
KEY_SECRET=your_cdp_key_secret_here
REQUEST_METHOD=POST
REQUEST_HOST=api.cdp.coinbase.com
REQUEST_PATH=/platform/v1/networks/base-mainnet/assets

# Optional: Client API Key for client-side requests
CLIENT_API_KEY=your_client_api_key_here
```

### 2. Generate JWT Token
Run the JWT generation script:

```bash
npm run generate-jwt
```

This will:
- Generate a fresh JWT token
- Display the export command
- Save the token to `.env.jwt` file
- Show expiration time

### 3. Use JWT in API Calls
The JWT system is now integrated into your CDP API calls. The system will:
- Automatically generate fresh tokens when needed
- Cache tokens until they're about to expire
- Handle token renewal transparently

## JWT Token Details

### Expiration
- **Token Lifetime**: 2 minutes (120 seconds)
- **Auto-Renewal**: Tokens are automatically renewed 10 seconds before expiry
- **Cache**: Tokens are cached to avoid unnecessary regeneration

### Security Features
- **ES256 Algorithm**: Uses elliptic curve digital signature algorithm
- **Nonce**: Each token includes a random nonce for security
- **URI Binding**: Tokens are bound to specific API endpoints
- **Time Validation**: Includes `nbf` (not before) and `exp` (expires) claims

## API Integration

### Server-Side Usage
```typescript
import { getValidJWT } from '@/lib/apis/cdp';

// In your API route
const jwt = await getValidJWT();
const response = await fetch('https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets', {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

### Client-Side Usage
```typescript
import { getValidJWT } from '@/lib/apis/cdp';

// In your component
const handleCDPRequest = async () => {
  try {
    const jwt = await getValidJWT();
    // Use JWT in your CDP API calls
  } catch (error) {
    console.error('Failed to get JWT:', error);
  }
};
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing required environment variables: KEY_NAME, KEY_SECRET
   ```
   **Solution**: Ensure all required environment variables are set in `.env.local`

2. **JWT Generation Failed**
   ```
   Error: CDP API authentication failed
   ```
   **Solution**: Check your CDP API credentials and network connection

3. **Token Expired**
   ```
   Error: JWT token has expired
   ```
   **Solution**: The system should auto-renew, but you can manually run `npm run generate-jwt`

### Debug Mode
To see detailed JWT generation logs, set:
```bash
DEBUG=cdp:jwt
```

## Security Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Rotate keys regularly**: Update your CDP API keys periodically
3. **Monitor usage**: Check your CDP API usage in the dashboard
4. **Use HTTPS**: Always use HTTPS for API calls in production

## Files Created

- `lib/cdp/jwt-generator.ts` - JWT generation utility
- `scripts/generate-jwt.ts` - JWT generation script
- `CDP_JWT_SETUP.md` - This setup guide

## Next Steps

1. Set up your environment variables
2. Test JWT generation with `npm run generate-jwt`
3. Integrate JWT into your CDP API calls
4. Monitor token expiration and renewal

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your CDP API credentials
3. Ensure all environment variables are set correctly
4. Check the CDP API documentation for endpoint requirements
