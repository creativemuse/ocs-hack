# Environment Variables Setup

## Required CDP API Keys

Add these to your `.env.local` file:

```bash
# CDP API Credentials (for live blockchain data)
CDP_API_KEY=organizations/your-org-id/apiKeys/your-key-id
CDP_API_SECRET=your-actual-secret-key-here
```

## Getting Your CDP Keys

1. **Go to CDP Portal**: https://portal.cdp.coinbase.com/
2. **Navigate to API Keys**: Find the API Keys section in your project
3. **Create New Key**: Click "Create API Key" button
4. **Copy Credentials**:
   - The key name looks like: `organizations/abc123/apiKeys/def456`
   - The secret is a long string of characters
5. **Add to `.env.local`**:
   ```bash
   CDP_API_KEY=organizations/abc123/apiKeys/def456
   CDP_API_SECRET=your_secret_key_here
   ```

## Contract Addresses (Already Configured)

These should already be in your `.env.local`:

```bash
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xc166a6FB38636e8430d6A2Efb7A601c226659425
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
```

## Complete `.env.local` Example

```bash
# CDP API Authentication (REQUIRED for live data)
CDP_API_KEY=organizations/your-org/apiKeys/your-key
CDP_API_SECRET=your-secret-here

# Contract Addresses (already set)
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xc166a6FB38636e8430d6A2Efb7A601c226659425
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913

# Other existing variables...
```

## Testing Your Setup

### 1. Start Development Server

```bash
npm run dev
```

### 2. Check Console Output

**Without CDP Keys:**
```
⚠️ CDP API not configured - using demo players
💡 Add CDP_API_KEY and CDP_API_SECRET to .env.local to use live blockchain data
```

**With CDP Keys (Success):**
```
🔍 Fetching active players from CDP SQL API...
✅ Found X active players from blockchain
✅ Using real live player data from CDP SQL API
```

### 3. Visual Confirmation

- Open your app in browser
- Click on any player avatar
- If setup correctly, you'll see:
  - **"Live Blockchain Data"** badge (green/blue gradient)
  - Real stats from blockchain
  - Perfect Rounds and Highest Win sections

## Troubleshooting

### Issue: "CDP API not configured"

**Solution**: Make sure you've added both variables to `.env.local`:
```bash
CDP_API_KEY=...
CDP_API_SECRET=...
```

### Issue: "Missing required CDP API credentials"

**Solution**: Check that:
1. Variable names are exactly `CDP_API_KEY` and `CDP_API_SECRET`
2. No extra spaces or quotes around values
3. `.env.local` file is in the root directory
4. You've restarted your dev server after adding variables

### Issue: "Invalid JWT token" or authentication errors

**Solution**: 
1. Verify your keys are correct from CDP Portal
2. Make sure `CDP_API_KEY` includes the full path: `organizations/.../apiKeys/...`
3. Secret key should be the full string without modifications

### Issue: "No active players found"

**Solution**: This is normal! It means:
- No one has played your game in the last 24 hours
- The system will show demo data automatically
- Once someone plays, their data will appear

## Legacy Environment Variable Support

The system also supports old variable names for backward compatibility:
- `KEY_NAME` → same as `CDP_API_KEY`
- `KEY_SECRET` → same as `CDP_API_SECRET`

If you have these set, they'll work too. But we recommend using `CDP_API_KEY` and `CDP_API_SECRET`.

## Security Notes

- **Never commit `.env.local`** to git (it's already in `.gitignore`)
- **Never share your CDP_API_SECRET** publicly
- Keep your secrets in `.env.local` only
- Regenerate keys if accidentally exposed

## What Happens Without Keys?

Don't have CDP keys yet? **No problem!**

- App works perfectly with demo data
- All features function normally
- Demo players appear (VITALIK.BASE.ETH, etc.)
- Get keys when you're ready for live blockchain data

## Summary

**Minimum Required:**
```bash
CDP_API_KEY=organizations/.../apiKeys/...
CDP_API_SECRET=your-secret-key
```

**Result:** Real live blockchain data in your game! 🎉

