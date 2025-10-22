# Trial Mode Configuration

This document explains how to configure the trial system to switch between Trial and Paid player modes.

## Environment Variable Configuration

Add the following environment variable to your `.env.local` file:

```bash
# Trial Mode Toggle
NEXT_PUBLIC_BYPASS_TRIAL=false
```

## Mode Options

### Trial Mode (Default)
```bash
NEXT_PUBLIC_BYPASS_TRIAL=false
# or simply omit the variable
```

**Behavior:**
- Users get 1 free trial game
- After trial is used, they must connect wallet and pay to continue
- Anonymous users can play 1 free game
- Wallet users get 1 free trial game per wallet

### Paid Player Mode
```bash
NEXT_PUBLIC_BYPASS_TRIAL=true
```

**Behavior:**
- No free trial games
- Users must connect wallet immediately
- Users must pay to play any games
- All users are treated as paid players

## How to Switch Modes

1. **Enable Trial Mode:**
   ```bash
   # In .env.local
   NEXT_PUBLIC_BYPASS_TRIAL=false
   ```

2. **Enable Paid Player Mode:**
   ```bash
   # In .env.local
   NEXT_PUBLIC_BYPASS_TRIAL=true
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Code Implementation

The toggle is implemented in `hooks/useTrialStatus.ts`:

```typescript
// Check if trial bypass is enabled via environment variable
const bypassTrial = process.env.NEXT_PUBLIC_BYPASS_TRIAL === 'true';

// Set initial state based on bypass setting
const [trialStatus, setTrialStatus] = useState<TrialStatus>({
  gamesPlayed: 0,
  gamesRemaining: bypassTrial ? 0 : 1, // No trial games if bypassed, 1 if trial enabled
  isTrialActive: !bypassTrial, // Trial active only if not bypassed
  requiresWallet: bypassTrial, // Require wallet only if bypassed
  canJoinPrizePool: true, // Both trial and paid players can join prize pools
  playerType: bypassTrial ? 'paid' : 'trial' // Set player type based on bypass setting
});
```

## Testing Both Modes

### Test Trial Mode
1. Set `NEXT_PUBLIC_BYPASS_TRIAL=false`
2. Restart server
3. Visit the app
4. Should see trial game option
5. Play 1 free game
6. After trial, should require wallet connection

### Test Paid Player Mode
1. Set `NEXT_PUBLIC_BYPASS_TRIAL=true`
2. Restart server
3. Visit the app
4. Should immediately require wallet connection
5. No free trial games available

## Production Deployment

For production deployment, set the environment variable in your deployment platform:

- **Vercel:** Add to Environment Variables in project settings
- **Netlify:** Add to Site Settings > Environment Variables
- **Railway:** Add to Variables tab
- **Docker:** Add to docker-compose.yml or Dockerfile

## Advanced Configuration

You can also implement more complex logic by modifying the `useTrialStatus` hook:

```typescript
// Example: Admin override
const isAdmin = checkAdminStatus(); // Your admin check logic
const bypassTrial = process.env.NEXT_PUBLIC_BYPASS_TRIAL === 'true' || isAdmin;

// Example: Wallet-based bypass
const bypassWallets = ['0x...', '0x...']; // Specific wallet addresses
const bypassTrial = process.env.NEXT_PUBLIC_BYPASS_TRIAL === 'true' || 
                   (walletAddress && bypassWallets.includes(walletAddress));
```
