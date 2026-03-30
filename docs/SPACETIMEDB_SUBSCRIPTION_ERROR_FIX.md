# SpacetimeDB Subscription Error Fix

## Issue
SpacetimeDB subscription was failing with error:
```
❌ SpacetimeDB subscription error: {isActive: true, identity: e, token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9...', connectionId: e, subscriptionBuilder: ƒ, …}
```

This was causing "Failed to load top earners" error on the home page.

## Root Causes

### 1. Incorrect Table Subscription
The subscription was trying to access `prize_history` table which is **NOT public** in the SpacetimeDB schema:

```rust
// ❌ This table is NOT public (missing "public" attribute)
#[spacetimedb::table(name = prize_history)]  // Should be: #[spacetimedb::table(name = prize_history, public)]
#[derive(Clone)]
pub struct PrizeHistory {
    // ...
}
```

### 2. Poor Error Handling
The `.onError()` callback was receiving a connection object instead of a proper Error, making debugging difficult.

## Solution

### 1. Fixed Subscription List
**File: `components/providers/SpacetimeProvider.tsx`**

Removed `prize_history` and added only **public** tables:

```typescript
.subscribe([
  'SELECT * FROM players',                    // ✅ Public
  'SELECT * FROM game_sessions',              // ✅ Public  
  'SELECT * FROM player_stats',               // ✅ Public
  'SELECT * FROM active_game_sessions',       // ✅ Public
  'SELECT * FROM pending_claims',             // ✅ Public
  'SELECT * FROM audio_files',                // ✅ Public
  'SELECT * FROM active_connections',         // ✅ Public
  'SELECT * FROM identity_wallet_mapping',    // ✅ Public
]);
```

### 2. Improved Error Handling
Enhanced the `.onError()` callback to properly extract error information:

```typescript
.onError((errorContext) => {
  if (!mounted) return;
  console.error('❌ SpacetimeDB subscription error:', errorContext);
  
  // Log detailed error information for debugging
  if (errorContext?.subscriptions) {
    console.error('Failed subscriptions:', errorContext.subscriptions);
  }
  if (errorContext?.error) {
    console.error('Error details:', errorContext.error);
  }
  
  // Extract the actual error message
  const errorMessage = errorContext?.error?.message || 
                     errorContext?.message || 
                     'Subscription failed';
  setError(new Error(`SpacetimeDB subscription error: ${errorMessage}`));
})
```

## Public vs Private Tables

### ✅ Public Tables (Client Can Subscribe)
- `players` - Wallet-connected users
- `game_sessions` - Game session data
- `player_stats` - Player statistics  
- `active_game_sessions` - Active game state
- `pending_claims` - Prize claims
- `audio_files` - Audio metadata
- `active_connections` - Connection tracking
- `identity_wallet_mapping` - Identity mapping

### ❌ Private Tables (Server-Only)
- `prize_history` - Prize distribution history
- `guest_game_sessions` - Guest session data
- `game_entries` - Entry tracking
- `anonymous_sessions` - Anonymous player data
- `question_attempts` - Question response data
- `admins` - Admin permissions

## Testing
1. Clear browser cache and localStorage
2. Reload the home page
3. Check browser console for:
   ```
   🚀 Initializing SpacetimeDB connection...
   ✅ Connected to SpacetimeDB with identity: <hex>
   ✅ SpacetimeDB subscriptions applied - data ready
   ```
4. Verify Top Earners section loads without errors

## Benefits

### 1. Fixes Subscription Errors
- Only subscribes to tables that actually exist and are public
- No more subscription failures due to private table access

### 2. Better Debugging
- Detailed error logging shows exactly which subscriptions failed
- Clear error messages help identify issues quickly

### 3. Improved Performance
- Fewer unnecessary subscriptions
- Faster connection initialization

### 4. Enhanced Reliability
- Robust error handling prevents crashes
- Graceful fallback when subscriptions fail

## Future Considerations

1. **Table Visibility Audit**: Review all table definitions to ensure proper public/private classification
2. **Subscription Optimization**: Consider subscribing only to tables actually needed by the UI
3. **Error Recovery**: Add retry logic for failed subscriptions
4. **Monitoring**: Track subscription success rates in production

## Related Files Modified
- `components/providers/SpacetimeProvider.tsx` - Fixed subscription list and error handling

## Notes
- This fix resolves the immediate "Failed to load top earners" issue
- All components using SpacetimeDB data will benefit from this fix
- No breaking changes - pure bug fix
- Compatible with existing SpacetimeDB SDK
