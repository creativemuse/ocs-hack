# SpacetimeDB Top Earners Loading Fix

## Issue
Players were seeing "Failed to load top Earners" error when loading the home page.

## Root Cause
**Race Condition in SpacetimeDB Connection Initialization**

The SpacetimeProvider was marking the connection as "ready" (`isConnected = true`) immediately after the WebSocket connection was established, but **before** the subscription queries had been applied and initial data loaded.

This caused components like `TopEarners` to try reading from `connection.db.players` before the data was available, resulting in errors.

### Before (Problematic Code):
```typescript
.onConnect((connection, identity, token) => {
  setConnection(connection);
  setIsConnected(true); // ❌ Marked as ready too early!
  
  connection.subscriptionBuilder().subscribe([
    'SELECT * FROM players',
    // ... other tables
  ]);
  // No callback to wait for subscription data
})
```

## Solution
Added `.onApplied()` callback to the subscription builder to ensure we only mark the connection as ready **after** initial subscription data has been loaded.

### After (Fixed Code):
```typescript
.onConnect((connection, identity, token) => {
  setConnection(connection);
  // Don't set isConnected yet - wait for subscriptions
  
  connection.subscriptionBuilder()
    .onApplied(() => {
      console.log('✅ SpacetimeDB subscriptions applied - data ready');
      setIsConnected(true); // ✅ Now marked as ready AFTER data loaded
    })
    .onError((err) => {
      console.error('❌ SpacetimeDB subscription error:', err);
      setError(err);
    })
    .subscribe([
      'SELECT * FROM players',
      'SELECT * FROM game_sessions',
      'SELECT * FROM player_stats',
      'SELECT * FROM active_game_sessions',
      'SELECT * FROM pending_claims',
      'SELECT * FROM prize_history',
      'SELECT * FROM audio_files',
    ]);
})
```

## Changes Made
**File: `components/providers/SpacetimeProvider.tsx`**

1. Moved `setIsConnected(true)` from `.onConnect()` to `.onApplied()` callback
2. Added `.onApplied()` callback to subscription builder to track when data is ready
3. Added `.onError()` callback to properly handle subscription errors
4. Added console logs for better debugging

## Benefits

### 1. Prevents Race Conditions
- Components wait for actual data before rendering
- No more attempts to read from empty/uninitialized collections

### 2. Better Error Handling
- Subscription errors are caught and reported
- Provider error state is updated if subscriptions fail

### 3. Improved User Experience
- Loading states work correctly
- No more "Failed to load" errors on page load
- Smooth data population when page loads

### 4. Better Debugging
- Clear console logs show connection lifecycle:
  - `✅ Connected to SpacetimeDB with identity: ...`
  - `✅ SpacetimeDB subscriptions applied - data ready`
  - Components only start after both messages appear

## Testing
1. Clear browser cache and localStorage
2. Reload the home page
3. Top Earners section should load without errors
4. Check browser console for proper connection sequence:
   ```
   🚀 Initializing SpacetimeDB connection...
   ✅ Connected to SpacetimeDB with identity: <hex>
   ✅ SpacetimeDB subscriptions applied - data ready
   ```

## Related Components
This fix benefits all components that read from SpacetimeDB:
- `TopEarners` - No longer fails on initial load
- `HighScoreDisplay` - Waits for data before rendering
- `ActivePlayers` - Gets proper player data
- `usePlayerWinnings` - Accesses initialized data
- Any custom hook reading from `connection.db.*`

## Future Improvements
Consider adding:
1. Retry logic for failed subscriptions
2. Timeout handling for slow connections
3. Progressive data loading (show partial data as it arrives)
4. Subscription health monitoring

## Notes
- This is a **critical fix** for production deployment
- Affects all users on initial page load
- No breaking changes - pure internal timing improvement
- Compatible with existing SpacetimeDB SDK

