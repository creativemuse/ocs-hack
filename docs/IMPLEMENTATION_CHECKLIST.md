# SpacetimeDB Implementation Checklist

## ✅ Step 1: Core Implementation (COMPLETED)

- [x] Added `executeSQL()` method for HTTP queries
- [x] Added WebSocket subscription system
- [x] Updated all data retrieval methods
- [x] Created 12+ new query and subscription methods
- [x] Added comprehensive documentation

---

## 🔄 Step 2: Hooks Created (COMPLETED)

### ✅ Hooks Available

- [x] **useTopEarners** - Fetch top earners with optional real-time updates
- [x] **usePlayerProfileLive** - Real-time player profile updates
- [x] **useActivePlayersLive** - Active players with polling
- [x] **useLeaderboardLive** - Leaderboard with optional real-time updates

### Usage Examples

```typescript
// Example 1: Top Earners with Polling (default)
const { topEarners, isLoading } = useTopEarners(10);

// Example 2: Top Earners with Real-Time Updates
const { topEarners, isLoading, isRealtime } = useTopEarners(10, { realtime: true });

// Example 3: Player Profile with Real-Time Updates
const { profile, isLoading } = usePlayerProfileLive(walletAddress);

// Example 4: Leaderboard with Real-Time Updates
const { stats, isLoading } = useLeaderboardLive(10, { realtime: true });
```

---

## 🚀 Step 3: API Routes Created (COMPLETED)

### ✅ New SpacetimeDB API Routes

- [x] `/api/top-earners` - Updated to use SpacetimeDB queries
- [x] `/api/spacetime-leaderboard` - Leaderboard data (paid/trial)
- [x] `/api/spacetime-player` - Player profile + prize history
- [x] `/api/spacetime-active` - Active players

### Test API Routes

```bash
# Test top earners
curl http://localhost:3000/api/top-earners?limit=5

# Test leaderboard (paid players)
curl http://localhost:3000/api/spacetime-leaderboard?limit=10&type=paid

# Test player profile
curl http://localhost:3000/api/spacetime-player?address=0x123...

# Test active players
curl http://localhost:3000/api/spacetime-active?limit=20
```

---

## 🧪 Step 4: Testing Implementation

### Browser Console Tests

Open your browser console and run:

```javascript
// Test 1: Initialize client
await spacetimeClient.initialize();

// Test 2: Query top earners
const earners = await spacetimeClient.getTopEarners(5);
console.log('Top Earners:', earners);

// Test 3: Query leaderboard
const leaderboard = await spacetimeClient.getLeaderboard(10);
console.log('Leaderboard:', leaderboard);

// Test 4: Query active players
const players = await spacetimeClient.getActivePlayers(20);
console.log('Active Players:', players);

// Test 5: Test WebSocket subscription
const subId = await spacetimeClient.subscribeToTopEarners(
  5,
  (data) => console.log('Real-time update:', data),
  (error) => console.error('Error:', error)
);

// Test 6: Unsubscribe (after testing)
await spacetimeClient.unsubscribe(subId);
```

### Component Tests

Create a test component to verify hooks work:

```tsx
// components/test/SpacetimeTest.tsx
'use client';

import { useTopEarners } from '@/hooks/useTopEarners';

export function SpacetimeTest() {
  const { topEarners, isLoading, error, isRealtime } = useTopEarners(5, { realtime: true });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Top 5 Earners {isRealtime && '🔴 LIVE'}</h2>
      {topEarners.map((earner, i) => (
        <div key={earner.wallet_address}>
          {i + 1}. {earner.username || earner.wallet_address} - ${earner.total_earnings} USDC
        </div>
      ))}
    </div>
  );
}
```

---

## 📋 Step 5: Component Updates

### Update TopEarners Component to Use Real-Time

Your `TopEarners` component already uses the hook, but you can enable real-time:

```tsx
// components/leaderboard/TopEarners.tsx
export default function TopEarners({ limit = 10, className = '' }: TopEarnersProps) {
  // Enable real-time updates
  const { topEarners, isLoading, error, isRealtime } = useTopEarners(limit, { 
    realtime: true // ⬅️ Add this
  });

  // Add real-time indicator
  return (
    <div className={`w-full ${className}`}>
      {isRealtime && (
        <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
          <span className="animate-pulse">●</span> Live Updates
        </div>
      )}
      {/* ... rest of component */}
    </div>
  );
}
```

### Create New Components

**Example: Live Leaderboard Component**

```tsx
// components/leaderboard/LiveLeaderboard.tsx
'use client';

import { useLeaderboardLive } from '@/hooks/useLeaderboardLive';

export function LiveLeaderboard({ limit = 10 }: { limit?: number }) {
  const { stats, isLoading, error, isRealtime } = useLeaderboardLive(limit, {
    realtime: true,
    type: 'paid',
  });

  if (isLoading) return <div>Loading leaderboard...</div>;
  if (error) return <div>Error loading leaderboard</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Leaderboard</h2>
        {isRealtime && (
          <span className="text-sm text-green-400 flex items-center gap-1">
            <span className="animate-pulse">●</span> Live
          </span>
        )}
      </div>
      
      {stats.map((stat, index) => (
        <div key={stat.player_identity} className="flex justify-between">
          <span>#{index + 1}</span>
          <span>Score: {stat.best_score}</span>
          <span>Games: {stat.total_games}</span>
        </div>
      ))}
    </div>
  );
}
```

**Example: Player Profile Component**

```tsx
// components/player/PlayerProfileCard.tsx
'use client';

import { usePlayerProfileLive } from '@/hooks/usePlayerProfileLive';

export function PlayerProfileCard({ address }: { address: string }) {
  const { profile, isLoading, error } = usePlayerProfileLive(address);

  if (isLoading) return <div>Loading profile...</div>;
  if (error || !profile) return <div>Profile not found</div>;

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <h3 className="font-bold">{profile.username || 'Anonymous'}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Games: {profile.games_played}</div>
        <div>Best Score: {profile.best_score}</div>
        <div>Total Score: {profile.total_score}</div>
        <div>Earnings: ${profile.total_earnings} USDC</div>
      </div>
    </div>
  );
}
```

---

## 🔥 Step 6: Enable Real-Time in Production

### Environment Variables

Ensure these are set in your `.env.local`:

```bash
# SpacetimeDB Configuration
SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_DATABASE=c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a
SPACETIME_MODULE=beat-me
SPACETIME_TOKEN=<your-token-if-needed>
```

### Enable in Components

Update your components to use real-time:

```tsx
// Before
const { data } = useTopEarners(10);

// After
const { data } = useTopEarners(10, { realtime: true });
```

---

## ✅ Step 7: Verify Everything Works

### Checklist

- [ ] **SQL Queries Work**
  - [ ] Open browser console
  - [ ] Run: `await spacetimeClient.getTopEarners(5)`
  - [ ] Verify data is returned (not empty array)

- [ ] **API Routes Work**
  - [ ] Navigate to `/api/top-earners?limit=5`
  - [ ] Verify JSON response with data
  - [ ] Check other API routes

- [ ] **Hooks Work**
  - [ ] Use hooks in components
  - [ ] Verify data loads
  - [ ] Check loading states work

- [ ] **WebSocket Subscriptions Work** (browser only)
  - [ ] Enable realtime in a component
  - [ ] Check browser console for WebSocket connection
  - [ ] Verify real-time updates when data changes

- [ ] **Error Handling Works**
  - [ ] Test with invalid data
  - [ ] Verify graceful fallbacks
  - [ ] Check error messages display

---

## 🎯 Quick Start Commands

```bash
# 1. Start development server
npm run dev

# 2. Open browser console at http://localhost:3000

# 3. Test SpacetimeDB queries
await spacetimeClient.initialize()
const data = await spacetimeClient.getTopEarners(5)
console.log(data)

# 4. Test API routes
# Open: http://localhost:3000/api/top-earners?limit=5

# 5. Enable real-time in your components
# Edit: components/leaderboard/TopEarners.tsx
# Add: { realtime: true } to useTopEarners()
```

---

## 📊 Monitoring & Debugging

### Browser DevTools

**WebSocket Connection:**
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. You should see: `wss://maincloud.spacetimedb.com/database/subscribe/...`
4. Click to see messages flowing

**Console Logs:**
- `✅ WebSocket connected to SpacetimeDB` - Connection successful
- `📊 Transaction update received` - Real-time data update
- `✅ Subscription applied: sub_X` - Subscription active

**Common Issues:**
- `⚠️ WebSocket subscriptions only available in browser` - Expected in server-side
- `❌ WebSocket error` - Check SPACETIME_HOST and network
- `⚠️ SpacetimeDB not connected` - Run `initialize()` first

---

## 🎉 Success Criteria

You're done when:

1. ✅ SQL queries return actual data (not empty arrays)
2. ✅ API routes return JSON with data
3. ✅ Hooks load data in components
4. ✅ WebSocket subscriptions connect successfully (in browser)
5. ✅ Real-time updates work when enabled
6. ✅ Components display live data indicator
7. ✅ Error handling works gracefully

---

## 📚 Additional Resources

- **SpacetimeDB Data Retrieval Guide**: `SPACETIMEDB_DATA_RETRIEVAL.md`
- **Implementation Complete Summary**: `SPACETIMEDB_IMPLEMENTATION_COMPLETE.md`
- **SpacetimeDB Docs**: https://spacetimedb.com/docs

---

## 🆘 Troubleshooting

### Issue: Empty Data Arrays

**Solution:**
```typescript
// Check if SpacetimeDB is initialized
await spacetimeClient.initialize();

// Check if tables have data (run reducers to populate)
await spacetimeClient.createPlayer('0x123...', 'testuser');
```

### Issue: WebSocket Won't Connect

**Solution:**
1. Check `SPACETIME_HOST` in `.env.local`
2. Verify you're in browser environment (not server-side)
3. Check browser console for errors
4. Try manual connection test

### Issue: Subscription Not Updating

**Solution:**
```typescript
// Verify subscription is active
const subId = await spacetimeClient.subscribe(...);
console.log('Subscription ID:', subId);

// Check WebSocket in DevTools Network tab
// Look for "WS" connections

// Verify data is actually changing in SpacetimeDB
```

---

## 🚀 Next Steps After Completion

1. **Optimize Queries** - Add indexes in SpacetimeDB Rust schema
2. **Add More Subscriptions** - Create custom queries for specific needs
3. **Performance Testing** - Monitor WebSocket connection stability
4. **User Experience** - Add loading skeletons and smooth transitions
5. **Analytics** - Track real-time connection usage and performance

---

**Status: Ready to Test!** 🎯

Run through the checklist and verify everything works. If you encounter issues, refer to the troubleshooting section or check the browser console for detailed error messages.

