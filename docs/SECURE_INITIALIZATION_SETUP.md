# Secure Initialization Setup with Session Tokens

This document explains how to set up secure initialization using session tokens for the Buy component in the OCS Alpha application.

## Overview

Secure initialization provides enhanced security for onramp transactions by using short-lived, one-time-use session tokens that authenticate users and manage sessions securely. This prevents API credentials from being exposed to the client.

## Environment Variables Setup

To enable secure initialization, you need to add the following environment variables to your `.env.local` file:

```bash
# Client-side variables (accessible in browser)
NEXT_PUBLIC_ONCHAINKIT_API_KEY="your_onchainkit_api_key"
NEXT_PUBLIC_CDP_PROJECT_ID="your_cdp_project_id"

# Server-side variables (not accessible in browser)
IRON_PASSWORD="your_secure_password_at_least_32_chars_long"
CDP_API_KEY_NAME="your_cdp_api_key_name"
CDP_API_KEY_PRIVATE_KEY="your_cdp_api_private_key"
CDP_PROJECT_ID="your_cdp_project_id"
ONCHAINKIT_API_KEY="your_onchainkit_api_key"

# For Secure Initialization (Session Tokens) - New Format
CDP_API_KEY_NAME="your_cdp_api_key_name"
CDP_API_KEY_PRIVATE_KEY="your_cdp_api_private_key"
CDP_PROJECT_ID="your_cdp_project_id"

# Legacy CDP credentials (for backward compatibility)
CDP_API_KEY="your_cdp_api_key"
CDP_API_SECRET="your_cdp_api_secret"
```

## How to Get CDP API Credentials

1. **Visit Coinbase Developer Platform**: Go to [https://portal.cdp.coinbase.com/](https://portal.cdp.coinbase.com/)

2. **Create or Select Your Project**: 
   - Create a new project or select an existing one
   - Navigate to the Onramp product

3. **Generate API Credentials**:
   - Go to the API Keys section
   - Create a new API key with RSA key pair
   - Copy the API key name and private key to your environment variables
   - Note the Project ID for your configuration

4. **Create Iron Password**:
   - Generate a secure password at least 32 characters long
   - This is used for session encryption

## Implementation Details

### Session Token API Route

The application includes a secure session token generation endpoint at `/api/session-token` that:

- Validates the wallet address
- Uses CDP API credentials with RSA-SHA256 JWT authentication
- Returns the token to the client for use in onramp flows

### GamePayment Component

The `GamePayment` component now:

1. **Generates Session Token**: Calls the session token API when a wallet is connected
2. **Uses Secure Initialization**: Generates onramp URLs with session tokens
3. **Provides Fallback**: Automatically falls back to standard mode if secure initialization fails
4. **Clear Indicators**: Shows users which security mode is active

## Benefits of Secure Initialization

- **Enhanced Security**: API credentials are never exposed to the client
- **Better Control**: Server-side validation before initiating transactions
- **Compliance**: Meets security requirements for production applications
- **One-time Use**: Session tokens expire quickly and can only be used once
- **Graceful Fallback**: Always provides a working onramp experience

## Troubleshooting

### Common Issues

1. **"Server configuration error"**: 
   - Ensure all CDP API credentials are set in your environment
   - Verify the credentials are valid in the CDP portal
   - Check that the private key is in the correct format

2. **"Failed to generate session token"**:
   - Check that your CDP API credentials have the correct permissions
   - Verify the wallet address is valid
   - Check the server logs for detailed error messages
   - The app will automatically fall back to standard mode

3. **Buy component not working**:
   - Ensure `NEXT_PUBLIC_ONCHAINKIT_API_KEY` is still set
   - Verify the OnchainKit provider is properly configured

### Testing

1. **Local Development**: 
   - Set up your `.env.local` file with all required variables
   - Test the session token generation endpoint
   - Verify the Buy component works with secure initialization
   - Test the fallback mode by temporarily removing CDP credentials

2. **Production Deployment**:
   - Add all environment variables to your hosting platform (Vercel, etc.)
   - Test the complete flow in production

## Security Notes

- **Never commit API credentials** to version control
- **Use environment variables** for all sensitive configuration
- **Rotate API keys** regularly for production applications
- **Monitor API usage** in the CDP portal for any suspicious activity
- **Use strong passwords** for Iron password (at least 32 characters)

## Environment Variable Reference

### Required for Secure Initialization
- `CDP_API_KEY_NAME`: Your CDP API key name
- `CDP_API_KEY_PRIVATE_KEY`: Your CDP API private key (RSA format)
- `CDP_PROJECT_ID`: Your CDP project ID

### Required for Basic Functionality
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`: OnchainKit API key (client-side)
- `ONCHAINKIT_API_KEY`: OnchainKit API key (server-side)

### Optional but Recommended
- `IRON_PASSWORD`: Secure password for session encryption (32+ chars)
- `NEXT_PUBLIC_CDP_PROJECT_ID`: CDP project ID (client-side)

## Next Steps

After setting up secure initialization:

1. Test the complete onramp flow
2. Monitor for any errors in the console
3. Verify that session tokens are being generated correctly
4. Test the Buy component with different wallet types
5. Verify fallback mode works when secure initialization fails

For additional support, refer to the [Coinbase Developer Platform documentation](https://docs.cdp.coinbase.com/).
