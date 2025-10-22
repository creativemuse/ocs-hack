# SpacetimeDB Data Retrieval Implementation

## Overview

Your SpacetimeDB implementation now supports **two methods** for data retrieval:

1. **SQL Queries** - One-time data fetching via HTTP
2. **WebSocket Subscriptions** - Real-time data updates

This document explains how to use both approaches effectively.

---

## 🎯 Implementation Summary

### ✅ What Was Added

1. **SQL Query System (`executeSQL` method)**
   - Direct HTTP queries to SpacetimeDB
   - Returns data immediately
   - Best for one-time data fetches

2. **WebSocket Subscription System**
   - Real-time bidirectional communication
   - Automatic reconnection on disconnect
   - Subscription lifecycle management
   - Best for live data that updates frequently

3. **Convenience Methods**
   - `getTopEarners()` - One-time query
   - `subscribeToTopEarners()` - Real-time updates
   - `getPlayerProfile()` - One-time query
   - `subscribeToPlayerProfile()` - Real-time updates
   - `getLeaderboard()` - One-time query
   - `subscribeToLeaderboard()` - Real-time updates
   - Plus many more...

---

## 📊 SQL Queries (One-Time Fetching)

### How It Works

```typescript
const results = await spacetimeClient.executeSQL<Type>(sql);
```

- Sends HTTP POST request to SpacetimeDB
- Returns data immediately
- No real-time updates

### Usage Examples

#### Example 1: Get Top Earners

```typescript
import { spacetimeClient } from '@/lib/apis/spacetime';

// Fetch top 10 earners
const topEarners = await spacetimeClient.getTopEarners(10);

console.log('Top earners:', topEarners);
// Output: Array of TopEarner objects
```

#### Example 2: Get Player Profile

```typescript
const walletAddress = '0x123...';
const profile = await spacetimeClient.getPlayerProfile(walletAddress);

if (profile) {
  console.log(`Username: ${profile.username}`);
  console.log(`Total Earnings: $${profile.total_earnings} USDC`);
}
```

#### Example 3: Custom SQL Query

```typescript
// Direct SQL query
const results = await spacetimeClient.executeSQL(`
  SELECT 
    wallet_address,
    total_score,
    games_played
  FROM players
  WHERE games_played > 10
  ORDER BY total_score DESC
  LIMIT 20
`);

console.log('Active players:', results);
```

### Available Query Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getTopEarners(limit)` | Top earners by USDC winnings | `TopEarner[]` |
| `getPlayerProfile(wallet)` | Player profile by wallet address | `Player \| null` |
| `getActivePlayers(limit)` | Recently active players | `Player[]` |
| `getPendingClaims(wallet?)` | Unclaimed prizes | `PendingClaim[]` |
| `getPrizeHistory(wallet, limit)` | Prize history for wallet | `PrizeHistory[]` |
| `getAllAudioFiles()` | All audio files | `AudioFile[]` |
| `getRandomAudioFiles(count)` | Random audio files | `AudioFile[]` |
| `getLeaderboard(limit)` | Paid player leaderboard | `PlayerStats[]` |
| `getTrialLeaderboard(limit)` | Trial player leaderboard | `PlayerStats[]` |
| `getPlayerStats(identity?)` | Player statistics | `PlayerStats \| null` |
| `getGameSession(sessionId)` | Game session details | `GameSession \| null` |
| `getPlayerGameHistory(identity, limit)` | Player's game history | `GameSession[]` |

---

## 🔴 WebSocket Subscriptions (Real-Time Updates)

### How It Works

1. Client opens WebSocket connection to SpacetimeDB
2. Client sends SQL queries to subscribe to
3. SpacetimeDB immediately sends current data (`onApplied`)
4. SpacetimeDB sends updates when data changes (`onUpdate`)

### Usage Examples

#### Example 1: Subscribe to Top Earners

```typescript
import { spacetimeClient } from '@/lib/apis/spacetime';
import { useState, useEffect } from 'react';

function TopEarnersComponent() {
  const [topEarners, setTopEarners] = useState([]);
  
  useEffect(() => {
    let subscriptionId: string;

    // Subscribe to top earners
    spacetimeClient.subscribeToTopEarners(
      10, // limit
      (earners) => {
        console.log('Top earners updated:', earners);
        setTopEarners(earners);
      },
      (error) => {
        console.error('Subscription error:', error);
      }
    ).then(id => {
      subscriptionId = id;
    });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (subscriptionId) {
        spacetimeClient.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return (
    <div>
      {topEarners.map((earner, index) => (
        <div key={earner.wallet_address}>
          {index + 1}. {earner.username} - ${earner.total_earnings} USDC
        </div>
      ))}
    </div>
  );
}
```

#### Example 2: Subscribe to Player Profile

```typescript
function PlayerProfileComponent({ walletAddress }: { walletAddress: string }) {
  const [profile, setProfile] = useState<Player | null>(null);
  
  useEffect(() => {
    let subscriptionId: string;

    // Subscribe to player profile
    spacetimeClient.subscribeToPlayerProfile(
      walletAddress,
      (player) => {
        console.log('Player profile updated:', player);
        setProfile(player);
      },
      (error) => {
        console.error('Subscription error:', error);
      }
    ).then(id => {
      subscriptionId = id;
    });

    return () => {
      if (subscriptionId) {
        spacetimeClient.unsubscribe(subscriptionId);
      }
    };
  }, [walletAddress]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h2>{profile.username}</h2>
      <p>Games Played: {profile.games_played}</p>
      <p>Best Score: {profile.best_score}</p>
      <p>Total Earnings: ${profile.total_earnings} USDC</p>
    </div>
  );
}
```

#### Example 3: Custom Subscription

```typescript
function LiveGameStats() {
  const [stats, setStats] = useState([]);
  
  useEffect(() => {
    let subscriptionId: string;

    // Custom subscription with SQL query
    spacetimeClient.subscribe(
      [
        `SELECT * FROM game_sessions WHERE ended_at IS NULL`,
        `SELECT * FROM active_game_sessions WHERE status = 'active'`
      ],
      {
        onApplied: (data) => {
          console.log('Initial data:', data);
          setStats(data.rows || []);
        },
        onUpdate: (data) => {
          console.log('Data updated:', data);
          // Re-fetch when data changes
          // ... your update logic
        },
        onError: (error) => {
          console.error('Subscription error:', error);
        }
      }
    ).then(id => {
      subscriptionId = id;
    });

    return () => {
      if (subscriptionId) {
        spacetimeClient.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return <div>{/* Render stats */}</div>;
}
```

### Available Subscription Methods

| Method | Description | Callback Data |
|--------|-------------|---------------|
| `subscribeToTopEarners(limit, onUpdate, onError?)` | Top earners with real-time updates | `TopEarner[]` |
| `subscribeToPlayerProfile(wallet, onUpdate, onError?)` | Player profile with real-time updates | `Player \| null` |
| `subscribeToLeaderboard(limit, onUpdate, onError?)` | Leaderboard with real-time updates | `PlayerStats[]` |
| `subscribe(queries[], callbacks)` | Custom subscription with SQL queries | Custom data |

---

## 🔄 When to Use Which Method

### Use **SQL Queries** when:
- ✅ You need data **once** (e.g., initial page load)
- ✅ Data doesn't change frequently
- ✅ You're in a server-side context (API routes)
- ✅ You want simpler code without subscription management

### Use **WebSocket Subscriptions** when:
- ✅ You need **real-time updates** (e.g., live leaderboard)
- ✅ Multiple users are interacting with the same data
- ✅ You're building a dashboard or live feed
- ✅ You want to minimize polling

---

## 🛠️ React Hook Examples

### Hook 1: useTopEarners (Real-Time)

```typescript
// hooks/useTopEarners.ts
import { useState, useEffect } from 'react';
import { spacetimeClient, TopEarner } from '@/lib/apis/spacetime';

export function useTopEarners(limit: number = 10) {
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscriptionId: string;

    // Subscribe to real-time updates
    spacetimeClient.subscribeToTopEarners(
      limit,
      (earners) => {
        setTopEarners(earners);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    ).then(id => {
      subscriptionId = id;
    });

    return () => {
      if (subscriptionId) {
        spacetimeClient.unsubscribe(subscriptionId);
      }
    };
  }, [limit]);

  return { topEarners, loading, error };
}
```

### Hook 2: usePlayerProfile (One-Time Query)

```typescript
// hooks/usePlayerProfile.ts
import { useState, useEffect } from 'react';
import { spacetimeClient, Player } from '@/lib/apis/spacetime';

export function usePlayerProfile(walletAddress: string) {
  const [profile, setProfile] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    spacetimeClient.getPlayerProfile(walletAddress)
      .then(data => {
        if (mounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  return { profile, loading, error };
}
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SpacetimeDB Client                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐              ┌─────────────────┐       │
│  │  SQL Queries   │              │  WebSocket      │       │
│  │  (HTTP POST)   │              │  Subscriptions  │       │
│  └────────────────┘              └─────────────────┘       │
│         │                                 │                │
│         │ One-time fetch                  │ Real-time      │
│         │                                 │ updates        │
│         ▼                                 ▼                │
│  ┌────────────────────────────────────────────────┐        │
│  │           SpacetimeDB Server                   │        │
│  │  - 14 Tables (Rust schema)                     │        │
│  │  - Reducers (write operations)                 │        │
│  │  - SQL Query Engine                            │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Complete Table Schema

Your SpacetimeDB has **14 tables**:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `audio_files` | Music tracks | `name`, `artist_name`, `song_title`, `ipfs_cid` |
| `game_sessions` | Individual games | `session_id`, `player_identity`, `score`, `player_type` |
| `active_game_sessions` | Current multiplayer sessions | `session_id`, `prize_pool`, `paid_player_count` |
| `player_stats` | Player statistics | `player_identity`, `best_score`, `player_type` |
| `question_attempts` | Question answers | `session_id`, `is_correct`, `time_taken` |
| `players` | Wallet users | `wallet_address`, `total_earnings`, `trial_completed` |
| `game_entries` | Entry verification | `session_id`, `is_trial`, `paid_tx_hash` |
| `anonymous_sessions` | Guest tracking | `session_id`, `games_played` |
| `guest_players` | Guest profiles | `guest_id`, `best_score` |
| `guest_game_sessions` | Guest game history | `session_id`, `score` |
| `prize_pools` | Prize management | `game_id`, `total_amount`, `winner_address` |
| `pending_claims` | Unclaimed prizes | `session_id`, `prize_amount`, `claimed` |
| `prize_history` | Prize distribution | `wallet_address`, `prize_amount`, `rank` |
| `admins` | Admin access | `admin_identity`, `admin_level` |

---

## 🚀 Next Steps

### 1. Update Your API Routes

Replace empty data returns with actual queries:

```typescript
// app/api/top-earners/route.ts
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET() {
  await spacetimeClient.initialize();
  const topEarners = await spacetimeClient.getTopEarners(10);
  
  return NextResponse.json({ topEarners });
}
```

### 2. Create Real-Time Components

Use subscriptions for live data:

```typescript
// components/leaderboard/LiveLeaderboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { spacetimeClient, PlayerStats } from '@/lib/apis/spacetime';

export function LiveLeaderboard() {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  
  useEffect(() => {
    let subId: string;
    
    spacetimeClient.subscribeToLeaderboard(10, setStats)
      .then(id => { subId = id; });
    
    return () => {
      if (subId) spacetimeClient.unsubscribe(subId);
    };
  }, []);
  
  return (
    <div>
      {stats.map((stat, i) => (
        <div key={stat.player_identity}>
          {i + 1}. Score: {stat.best_score}
        </div>
      ))}
    </div>
  );
}
```

### 3. Test the Implementation

```bash
# Start your dev server
npm run dev

# Open browser console and test:
await spacetimeClient.initialize();
const earners = await spacetimeClient.getTopEarners(5);
console.log(earners);
```

---

## ⚠️ Important Notes

### WebSocket Availability
- **Browser only**: WebSocket subscriptions only work in browser environment
- **Server-side**: Use SQL queries in API routes and server components
- **Automatic fallback**: Client gracefully handles missing WebSocket support

### Connection Management
- **Auto-reconnect**: WebSocket reconnects automatically on disconnect (max 5 attempts)
- **Subscription persistence**: Active subscriptions automatically re-register on reconnect
- **Cleanup**: Always unsubscribe when components unmount to prevent memory leaks

### Performance Tips
1. **Group subscriptions with same lifetime** together
2. **Subscribe before unsubscribing** when updating queries (zero-copy optimization)
3. **Avoid overlapping queries** that return intersecting data
4. **Use SQL LIMIT** clauses to reduce data transfer
5. **Unsubscribe** when data is no longer needed

---

## 🎉 Summary

You now have a **fully functional SpacetimeDB data retrieval system** with:

✅ **SQL Queries** - Implemented via `executeSQL()` method  
✅ **WebSocket Subscriptions** - Implemented with full lifecycle management  
✅ **Convenience Methods** - 12+ pre-built query and subscription methods  
✅ **Type Safety** - Full TypeScript types matching Rust schema  
✅ **Error Handling** - Graceful fallbacks and error callbacks  
✅ **Auto-Reconnect** - Resilient WebSocket connection  

**Your data is no longer empty!** 🚀

The tables are correctly defined in Rust, reducers write data properly, and now you can read data using both one-time queries and real-time subscriptions.

