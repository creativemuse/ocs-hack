# CDP SQL API Usage Examples

Quick reference for using CDP SQL API in your game components.

## Basic Setup

### In an API Route

```typescript
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

export async function GET() {
  try {
    const sqlClient = createCDPSQLClient();
    const results = await sqlClient.executeQuery('SELECT ...');
    return Response.json(results.result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### In a React Component (via API)

```typescript
'use client';
import { useState, useEffect } from 'react';

export function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/my-blockchain-data')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{/* Render data */}</div>;
}
```

## Pre-Built Queries

### Get Active Players

```typescript
// In an API route
const sqlClient = createCDPSQLClient();
const players = await sqlClient.getActivePlayers(
  contractAddress,
  usdcAddress,
  24 // hours
);

// Returns: [{ address, last_active, games_played, total_score }]
```

### Get Player Profile

```typescript
const profile = await sqlClient.getPlayerProfile(
  playerAddress,
  contractAddress,
  usdcAddress
);

// Returns: {
//   total_games,
//   perfect_rounds,
//   first_game,
//   last_game,
//   total_earnings,
//   payout_count,
//   highest_payout
// }
```

### Get Top Earners (Leaderboard)

```typescript
const topEarners = await sqlClient.getTopEarners(
  contractAddress,
  usdcAddress,
  10 // limit
);

// Returns: [{ address, total_earnings, payout_count }]
```

### Get Recent Game Events

```typescript
const events = await sqlClient.getRecentGameEvents(
  contractAddress,
  20 // limit
);

// Returns: [{
//   event_name,
//   player,
//   block_timestamp,
//   transaction_hash,
//   parameters
// }]
```

## Custom Queries

### Query Template

```typescript
const sqlClient = createCDPSQLClient();

const sql = `
  SELECT 
    column1,
    column2,
    COUNT(*) as count
  FROM base.events
  WHERE address = '${contractAddress.toLowerCase()}'
    AND event_name = 'YourEvent'
  GROUP BY column1, column2
  ORDER BY count DESC
  LIMIT 10
`;

const response = await sqlClient.executeQuery(sql);
const results = response.result;
```

### Available Tables

#### base.events
```sql
SELECT 
  event_name,           -- Event name (e.g., 'GameStarted')
  transaction_from,     -- Player address
  transaction_hash,     -- Transaction hash
  block_timestamp,      -- When it happened
  block_number,         -- Block number
  parameters,           -- Event parameters (Map type)
  address              -- Contract address
FROM base.events
WHERE address = '0x...' -- Your contract
```

#### base.transfers
```sql
SELECT 
  from_address,        -- Who sent the tokens
  to_address,          -- Who received them
  value,               -- Amount in wei (divide by 1000000 for USDC)
  token_address,       -- Token contract (USDC address)
  block_timestamp,     -- When transfer happened
  transaction_hash     -- Transaction hash
FROM base.transfers
WHERE token_address = '0x...' -- USDC address
```

#### base.transactions
```sql
SELECT 
  transaction_hash,
  from_address,
  to_address,
  value,              -- Native token value
  gas_price,
  gas_used,
  block_number,
  block_timestamp
FROM base.transactions
WHERE to_address = '0x...' -- Your contract
```

## Example: Build a Leaderboard Component

### 1. Create API Route

```typescript
// app/api/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

const CONTRACT = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS!;
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

export async function GET() {
  try {
    const sqlClient = createCDPSQLClient();
    const topEarners = await sqlClient.getTopEarners(CONTRACT, USDC, 10);
    
    return NextResponse.json({ 
      leaderboard: topEarners,
      source: 'blockchain' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
```

### 2. Create React Hook

```typescript
// hooks/useLeaderboard.ts
import { useState, useEffect } from 'react';

export const useLeaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaders(data.leaderboard);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return { leaders, loading };
};
```

### 3. Create Component

```typescript
// components/Leaderboard.tsx
'use client';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

export function Leaderboard() {
  const { leaders, loading } = useLeaderboard();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Top Earners</h2>
      {leaders.map((player, index) => (
        <div key={player.address}>
          <span>#{index + 1}</span>
          <Avatar address={player.address} chain={base} />
          <Name address={player.address} chain={base} />
          <span>{player.total_earnings} USDC</span>
        </div>
      ))}
    </div>
  );
}
```

## Example: Real-Time Activity Feed

```typescript
// app/api/activity-feed/route.ts
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

export async function GET() {
  const sqlClient = createCDPSQLClient();
  const events = await sqlClient.getRecentGameEvents(
    process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS!,
    20
  );

  // Transform events to user-friendly messages
  const activities = events.map(event => {
    switch (event.event_name) {
      case 'GameStarted':
        return {
          player: event.player,
          action: 'started a new game',
          timestamp: event.block_timestamp
        };
      case 'GameCompleted':
        return {
          player: event.player,
          action: 'completed a game',
          timestamp: event.block_timestamp
        };
      case 'PerfectRound':
        return {
          player: event.player,
          action: 'got a perfect round! 🎉',
          timestamp: event.block_timestamp
        };
      default:
        return null;
    }
  }).filter(Boolean);

  return Response.json({ activities });
}
```

## Example: Player Stats Dashboard

```typescript
// Custom query for comprehensive stats
const sql = `
  WITH game_stats AS (
    SELECT 
      transaction_from as player,
      COUNT(*) as total_games,
      COUNT(DISTINCT DATE(block_timestamp)) as days_played
    FROM base.events
    WHERE address = '${contractAddress}'
      AND event_name = 'GameCompleted'
    GROUP BY transaction_from
  ),
  earning_stats AS (
    SELECT 
      to_address as player,
      SUM(CAST(value AS DOUBLE) / 1000000.0) as total_earnings,
      AVG(CAST(value AS DOUBLE) / 1000000.0) as avg_earning
    FROM base.transfers
    WHERE token_address = '${usdcAddress}'
      AND from_address = '${contractAddress}'
    GROUP BY to_address
  )
  SELECT 
    gs.player,
    gs.total_games,
    gs.days_played,
    COALESCE(es.total_earnings, 0) as total_earnings,
    COALESCE(es.avg_earning, 0) as avg_earning_per_game
  FROM game_stats gs
  LEFT JOIN earning_stats es ON gs.player = es.player
  ORDER BY total_earnings DESC
  LIMIT 50
`;
```

## Common Patterns

### Time-Based Filtering

```typescript
// Last 7 days
AND block_timestamp > now() - INTERVAL 7 DAY

// Last hour
AND block_timestamp > now() - INTERVAL 1 HOUR

// Specific date range
AND block_timestamp BETWEEN '2025-01-01' AND '2025-01-31'
```

### Aggregations

```typescript
// Count distinct players
COUNT(DISTINCT transaction_from) as unique_players

// Average score
AVG(CAST(parameters->>'score' AS INT)) as avg_score

// Total volume
SUM(CAST(value AS DOUBLE) / 1000000.0) as total_volume
```

### Event Parameter Access

```typescript
// Access event parameters (they're stored as Maps)
parameters->>'player' as player_address
parameters->>'score' as score
parameters->>'round' as round_number

// Cast to proper types
CAST(parameters->>'score' AS INT) as score
CAST(parameters->>'amount' AS DOUBLE) as amount
```

## Performance Tips

1. **Use Indexes**: Contract address and timestamp are indexed
2. **Limit Results**: Always use `LIMIT` to cap result size
3. **Time Windows**: Prefer recent data (last 24h) for faster queries
4. **Cache Results**: Cache on client-side with SWR or React Query
5. **Batch Queries**: Combine related queries with CTEs (WITH clauses)

## Error Handling Template

```typescript
export async function GET(req: NextRequest) {
  try {
    // Check configuration
    if (!process.env.KEY_NAME || !process.env.KEY_SECRET) {
      return NextResponse.json(
        { error: 'CDP API not configured' },
        { status: 503 }
      );
    }

    // Execute query
    const sqlClient = createCDPSQLClient();
    const results = await sqlClient.executeQuery(sql);

    // Return results
    return NextResponse.json({
      data: results.result,
      source: 'blockchain',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('CDP query error:', error);
    
    // Return fallback data or error
    return NextResponse.json(
      { 
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown'
      },
      { status: 500 }
    );
  }
}
```

## Resources

- [CDP SQL API Docs](https://docs.cdp.coinbase.com/data/sql-api/overview)
- [Schema Reference](https://docs.cdp.coinbase.com/data/sql-api/schema)
- [CoinbaSeQL Grammar](https://docs.cdp.coinbase.com/data/sql-api/sql)

## Need Help?

Check existing implementations:
- `lib/cdp/sql-api.ts` - All query methods
- `app/api/active-players-live/route.ts` - Active players example
- `app/api/player-profile/route.ts` - Profile query example
- `hooks/usePlayerProfile.ts` - React hook pattern

