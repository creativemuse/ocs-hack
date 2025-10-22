# 🚀 Quick Start Guide - SpacetimeDB Data Retrieval

## ✨ What's Been Done

Your SpacetimeDB now has **full data retrieval capabilities**! Here's what was implemented:

1. ✅ **SQL Query System** - One-time data fetching via HTTP
2. ✅ **WebSocket Subscriptions** - Real-time data updates
3. ✅ **4 Custom Hooks** - Easy-to-use React hooks
4. ✅ **3 New API Routes** - Server-side data endpoints
5. ✅ **12+ Query Methods** - Pre-built convenience functions

---

## 🏃 Get Started in 3 Steps

### Step 1: Test SQL Queries (2 minutes)

Open your browser console at `http://localhost:3000` and run:

```javascript
// Initialize the client
await spacetimeClient.initialize();

// Test query #1: Get top earners
const earners = await spacetimeClient.getTopEarners(5);
console.log('Top Earners:', earners);

// Test query #2: Get leaderboard
const leaderboard = await spacetimeClient.getLeaderboard(10);
console.log('Leaderboard:', leaderboard);

// Test query #3: Get active players
const players = await spacetimeClient.getActivePlayers(20);
console.log('Active Players:', players);
```

**Expected Result:** You should see actual data (not empty arrays)!

---

### Step 2: Enable Real-Time Updates (1 minute)

Update your `TopEarners` component to use real-time data:

```tsx
// components/leaderboard/TopEarners.tsx

export default function TopEarners({ limit = 10, className = '' }: TopEarnersProps) {
  // Simply add { realtime: true } to enable WebSocket subscriptions
  const { topEarners, isLoading, error, isRealtime } = useTopEarners(limit, { 
    realtime: true // ⬅️ Add this line
  });

  // Optional: Add live indicator
  return (
    <div className={`w-full ${className}`}>
      {isRealtime && (
        <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
          <span className="animate-pulse">●</span> Live Updates
        </div>
      )}
      
      {/* ... rest of your component */}
    </div>
  );
}
```

---

### Step 3: Test API Routes (1 minute)

Open these URLs in your browser or use curl:

```bash
# Top earners
http://localhost:3000/api/top-earners?limit=5

# Leaderboard (paid players)
http://localhost:3000/api/spacetime-leaderboard?limit=10&type=paid

# Active players
http://localhost:3000/api/spacetime-active?limit=20
```

**Expected Result:** You should see JSON responses with actual data!

---

## 🎯 Available Hooks

All hooks are ready to use in your components:

### 1. useTopEarners

```tsx
// With polling (default)
const { topEarners, isLoading } = useTopEarners(10);

// With real-time updates
const { topEarners, isLoading, isRealtime } = useTopEarners(10, { realtime: true });
```

### 2. usePlayerProfileLive

```tsx
const { profile, isLoading, error } = usePlayerProfileLive(walletAddress);
```

### 3. useActivePlayersLive

```tsx
const { players, isLoading, lastUpdated } = useActivePlayersLive(50);
```

### 4. useLeaderboardLive

```tsx
// Paid player leaderboard with real-time
const { stats, isLoading } = useLeaderboardLive(10, { realtime: true });

// Trial player leaderboard with polling
const { stats } = useLeaderboardLive(10, { type: 'trial' });
```

---

## 📊 Available Query Methods

Use these directly in your code:

```typescript
import { spacetimeClient } from '@/lib/apis/spacetime';

// Initialize first (only once)
await spacetimeClient.initialize();

// Then use any of these:
const earners = await spacetimeClient.getTopEarners(10);
const profile = await spacetimeClient.getPlayerProfile(wallet);
const players = await spacetimeClient.getActivePlayers(50);
const leaderboard = await spacetimeClient.getLeaderboard(10);
const claims = await spacetimeClient.getPendingClaims(wallet);
const history = await spacetimeClient.getPrizeHistory(wallet, 20);
const audioFiles = await spacetimeClient.getRandomAudioFiles(10);
```

---

## 🔴 Real-Time Subscriptions

For live data that updates automatically:

```typescript
// Subscribe to top earners
const subId = await spacetimeClient.subscribeToTopEarners(
  10,
  (data) => {
    console.log('Top earners updated:', data);
    // Update your component state here
  },
  (error) => {
    console.error('Subscription error:', error);
  }
);

// Don't forget to unsubscribe when done
await spacetimeClient.unsubscribe(subId);
```

---

## 🆕 New API Routes

Three new SpacetimeDB-specific API routes:

1. **`/api/spacetime-leaderboard`** - Get leaderboard data
   ```bash
   GET /api/spacetime-leaderboard?limit=10&type=paid
   ```

2. **`/api/spacetime-player`** - Get player profile + history
   ```bash
   GET /api/spacetime-player?address=0x123...
   ```

3. **`/api/spacetime-active`** - Get active players
   ```bash
   GET /api/spacetime-active?limit=50
   ```

---

## 🎨 Example Components

### Live Leaderboard

```tsx
'use client';

import { useLeaderboardLive } from '@/hooks/useLeaderboardLive';

export function LiveLeaderboard() {
  const { stats, isLoading, isRealtime } = useLeaderboardLive(10, { 
    realtime: true 
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Leaderboard {isRealtime && '🔴 LIVE'}</h2>
      {stats.map((stat, i) => (
        <div key={stat.player_identity}>
          #{i + 1} - Score: {stat.best_score} - Games: {stat.total_games}
        </div>
      ))}
    </div>
  );
}
```

### Player Profile Card

```tsx
'use client';

import { usePlayerProfileLive } from '@/hooks/usePlayerProfileLive';

export function PlayerProfile({ address }: { address: string }) {
  const { profile, isLoading } = usePlayerProfileLive(address);

  if (isLoading) return <div>Loading...</div>;
  if (!profile) return <div>Player not found</div>;

  return (
    <div className="border rounded p-4">
      <h3>{profile.username || 'Anonymous'}</h3>
      <p>Games: {profile.games_played}</p>
      <p>Best Score: {profile.best_score}</p>
      <p>Earnings: ${profile.total_earnings} USDC</p>
    </div>
  );
}
```

---

## ⚡ Performance Tips

1. **Use real-time only when needed** - Polling is fine for data that doesn't change often
2. **Set appropriate limits** - Don't query more data than you need
3. **Cleanup subscriptions** - Always unsubscribe in useEffect cleanup
4. **Use the right hook** - Each hook is optimized for its use case

---

## 🐛 Troubleshooting

### "Empty arrays returned"

```typescript
// Make sure to initialize first
await spacetimeClient.initialize();

// Then query
const data = await spacetimeClient.getTopEarners(5);
```

### "WebSocket won't connect"

1. Check you're in browser environment (not server-side)
2. Open DevTools → Network → WS tab
3. Look for connection to `wss://maincloud.spacetimedb.com`

### "No data in tables"

Your tables might be empty. Populate them by:
- Playing games (triggers reducers)
- Running test scripts
- Manually calling reducers

---

## 📚 Documentation

- **`SPACETIMEDB_DATA_RETRIEVAL.md`** - Complete usage guide
- **`SPACETIMEDB_IMPLEMENTATION_COMPLETE.md`** - Technical details
- **`IMPLEMENTATION_CHECKLIST.md`** - Step-by-step checklist

---

## ✅ Verification Checklist

- [ ] SQL queries return data (not empty arrays)
- [ ] API routes return JSON with data
- [ ] Hooks work in components
- [ ] Real-time subscriptions connect (check DevTools)
- [ ] Components display live data when enabled

---

## 🎉 You're Ready!

Your SpacetimeDB is now fully functional with:

✅ SQL Queries for one-time data fetching  
✅ WebSocket Subscriptions for real-time updates  
✅ Custom React Hooks for easy integration  
✅ API Routes for server-side data access  
✅ Complete error handling and fallbacks  

**Start by testing in the browser console, then enable real-time in your components!**

---

## 🆘 Need Help?

1. Check browser console for error messages
2. Verify environment variables in `.env.local`
3. Review the comprehensive documentation files
4. Test with the browser console commands above

**Happy coding!** 🚀

