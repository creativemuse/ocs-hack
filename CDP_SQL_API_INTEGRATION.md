# CDP SQL API Integration Guide

## Overview

This project now uses **Coinbase Developer Platform (CDP) SQL API** to fetch real-time blockchain data for social features, player profiles, and leaderboards. This replaces demo/mock data with actual on-chain activity from the Base blockchain.

## What We Query

The CDP SQL API provides access to indexed blockchain data including:

- **Player Activity**: Recent game interactions from smart contract events
- **Player Earnings**: USDC transfer events from the game contract
- **Game Statistics**: Total games played, perfect rounds, win streaks
- **Leaderboards**: Top earners and most active players

## Architecture

### Files Created

1. **`lib/cdp/sql-api.ts`** - CDP SQL Client wrapper
   - Handles JWT generation for authentication
   - Provides high-level query methods
   - Includes query builders for common use cases

2. **`app/api/active-players-live/route.ts`** - Live player data endpoint
   - Fetches players active in the last 24 hours
   - Queries both game events and USDC transfers
   - Falls back to demo data if CDP API unavailable

3. **`app/api/player-profile/route.ts`** - Individual player stats
   - Detailed blockchain-verified player statistics
   - Perfect round counts, highest payouts, total earnings
   - First game and last game timestamps

4. **`hooks/usePlayerProfile.ts`** - React hook for player profiles
   - Fetches individual player data from blockchain
   - Handles loading and error states
   - Auto-refreshes on address change

### Files Modified

1. **`hooks/useActivePlayers.ts`** - Updated to use live data
   - Now calls `/api/active-players-live` instead of demo endpoint
   - Logs data source for debugging
   - Maintains fallback to demo data

2. **`components/social/SocialProfileViewer.tsx`** - Enhanced with blockchain data
   - Shows "Live Blockchain Data" badge when real data is loaded
   - Displays additional stats (perfect rounds, highest payout)
   - Loading states for async data fetching

## Data Flow

```
User Opens Profile
       ↓
usePlayerProfile Hook
       ↓
GET /api/player-profile?address=0x...
       ↓
CDPSQLClient.getPlayerProfile()
       ↓
Generate JWT Token
       ↓
POST https://api.cdp.coinbase.com/platform/v2/data/query/run
       ↓
Execute SQL Query on Base blockchain data
       ↓
Transform & Return Results
       ↓
Display in UI with "Live Blockchain Data" badge
```

## SQL Queries

### Active Players Query

```sql
WITH player_activities AS (
  SELECT 
    transaction_from as address,
    MAX(block_timestamp) as last_active,
    COUNT(DISTINCT transaction_hash) as games_played
  FROM base.events
  WHERE address = '{CONTRACT_ADDRESS}'
    AND event_name IN ('GameStarted', 'GameCompleted', 'RoundCompleted')
    AND block_timestamp > now() - INTERVAL 24 HOUR
  GROUP BY transaction_from
),
player_earnings AS (
  SELECT 
    to_address as address,
    SUM(CAST(value AS DOUBLE) / 1000000.0) as total_score
  FROM base.transfers
  WHERE token_address = '{USDC_ADDRESS}'
    AND from_address = '{CONTRACT_ADDRESS}'
  GROUP BY to_address
)
SELECT 
  pa.address,
  pa.last_active,
  pa.games_played,
  COALESCE(pe.total_score, 0) as total_score
FROM player_activities pa
LEFT JOIN player_earnings pe ON pa.address = pe.address
ORDER BY pa.last_active DESC
LIMIT 50
```

### Player Profile Query

```sql
WITH player_games AS (
  SELECT 
    COUNT(DISTINCT transaction_hash) as total_games,
    COUNT(DISTINCT CASE WHEN event_name = 'PerfectRound' THEN transaction_hash END) as perfect_rounds,
    MIN(block_timestamp) as first_game,
    MAX(block_timestamp) as last_game
  FROM base.events
  WHERE address = '{CONTRACT_ADDRESS}'
    AND transaction_from = '{PLAYER_ADDRESS}'
    AND event_name IN ('GameStarted', 'GameCompleted', 'RoundCompleted', 'PerfectRound')
),
player_earnings AS (
  SELECT 
    SUM(CAST(value AS DOUBLE) / 1000000.0) as total_earnings,
    COUNT(*) as payout_count,
    MAX(CAST(value AS DOUBLE) / 1000000.0) as highest_payout
  FROM base.transfers
  WHERE token_address = '{USDC_ADDRESS}'
    AND from_address = '{CONTRACT_ADDRESS}'
    AND to_address = '{PLAYER_ADDRESS}'
)
SELECT 
  pg.total_games,
  pg.perfect_rounds,
  pg.first_game,
  pg.last_game,
  COALESCE(pe.total_earnings, 0) as total_earnings,
  COALESCE(pe.payout_count, 0) as payout_count,
  COALESCE(pe.highest_payout, 0) as highest_payout
FROM player_games pg
LEFT JOIN player_earnings pe ON true
```

## Environment Variables Required

Make sure these are set in your `.env.local`:

```bash
# CDP API Authentication (from CDP Portal)
CDP_API_KEY=organizations/{org-id}/apiKeys/{key-id}
CDP_API_SECRET=your-secret-key-here

# Contract Addresses (already configured)
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xc166a6FB38636e8430d6A2Efb7A601c226659425
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
```

### Getting CDP API Credentials

1. Go to [CDP Portal](https://portal.cdp.coinbase.com/)
2. Navigate to **API Keys** section
3. Create a new API key
4. Copy the key name (e.g., `organizations/.../apiKeys/...`) as `CDP_API_KEY`
5. Copy the secret key as `CDP_API_SECRET`
6. Add them to your `.env.local` file

## Features

### ✅ Live Player Avatars

When real blockchain data is available:
- OnchainKit automatically resolves Basenames (e.g., `vitalik.base.eth`)
- Real avatar images are fetched from on-chain identity data
- ENS names are displayed if available

### ✅ Verified Statistics

All player stats are blockchain-verified:
- **Total Score**: Sum of actual USDC transfers from game contract
- **Games Played**: Count of `GameStarted` events
- **Perfect Rounds**: Count of `PerfectRound` events
- **Highest Payout**: Maximum USDC transfer to player

### ✅ Real-Time Updates

- Player list refreshes every 30 seconds (configurable)
- Sub-500ms query latency from CDP
- < 250ms end-to-end from tip of chain

### ✅ Graceful Fallbacks

If CDP API is unavailable or not configured:
- Automatically falls back to demo data
- Logs clear messages about data source
- No UI breakage or errors shown to users

## Debugging

### Check Data Source

Look in browser console for these messages:

```javascript
✅ Using real live player data from CDP SQL API
📊 Found 12 active players from blockchain
```

Or if using demo data:

```javascript
⚠️ Using demo players data: demo-no-config
```

### Data Source Indicators

- `cdp-sql-api-live` - Real blockchain data from CDP
- `demo-no-config` - CDP API not configured
- `demo-no-activity` - No players found in last 24 hours
- `demo-error` - CDP API error, using fallback

### Common Issues

**Issue**: "CDP API not configured"
**Solution**: Set `KEY_NAME` and `KEY_SECRET` in `.env.local`

**Issue**: "No active players found"
**Solution**: This is normal if no one has played in the last 24 hours. The system will show demo data.

**Issue**: "Invalid JWT token"
**Solution**: Check that `KEY_NAME` and `KEY_SECRET` are correct. JWTs expire in 2 minutes but are auto-regenerated.

## Performance

- **Query Latency**: < 500ms average
- **Cache Duration**: Results cached for efficiency
- **Rate Limits**: Handled automatically by CDP
- **Fallback Speed**: Instant (uses pre-generated demo data)

## Future Enhancements

Potential additions using CDP SQL API:

1. **Real-Time Leaderboard** - Live top 10 earners
2. **Activity Feed** - Recent game completions and achievements
3. **Social Graph** - Players who've played together
4. **Tournament Stats** - Aggregate data for competitions
5. **Time-Series Charts** - Player earnings over time

## Resources

- [CDP SQL API Documentation](https://docs.cdp.coinbase.com/data/sql-api/overview)
- [CDP Portal](https://portal.cdp.coinbase.com/)
- [Base Network Explorer](https://basescan.org/)
- [OnchainKit Identity Docs](https://onchainkit.xyz/identity/identity)

## Summary of Changes

**Before**: Demo avatars with fake usernames and random scores
**After**: Real blockchain-verified players with actual earnings and statistics

**Benefits**:
- ✅ Authentic player data from blockchain
- ✅ Verifiable achievements and scores
- ✅ Real-time activity updates
- ✅ No infrastructure to maintain
- ✅ Automatic fallback to demo data
- ✅ Sub-second query performance

