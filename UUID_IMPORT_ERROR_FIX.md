# Game Entry Errors Fix

## Issues

### Issue 1: UUID Import Error
When clicking "Join Game", users were encountering a JavaScript error:
```
TypeError: s is not a function
```

This error was occurring in the minified JavaScript after the SpacetimeDB connection was established and the GameEntry component received the `playerModeChoice: trial`.

### Issue 2: SpacetimeDB Unsubscribe Error
After fixing the UUID issue, a second error appeared:
```
TypeError: unsubscribe is not a function
    at useTopEarners.useEffect
```

This error was occurring in the `useTopEarners` hook when trying to clean up event listeners.

## Root Causes

### Issue 1: UUID Import Conflict
The error was caused by the `uuid` package import in `/lib/utils/sessionManager.ts`. The project had multiple versions of the `uuid` package installed (v8.3.2, v9.0.1, and v11.1.0) due to various dependencies, which created conflicts during the build process.

The import:
```typescript
import { v4 as uuidv4 } from 'uuid';
```

Was failing because the minified build was trying to call `s` (the minified version of `uuidv4`) as a function, but it was undefined or not properly resolved.

### Issue 2: Incorrect SpacetimeDB Event Handler Cleanup
The `useTopEarners` hook was incorrectly assuming that SpacetimeDB's `onInsert`, `onUpdate`, and `onDelete` methods return unsubscribe functions. However, SpacetimeDB uses a different pattern with separate `removeOnInsert`, `removeOnUpdate`, and `removeOnDelete` methods for cleanup.

## Solutions

### Fix 1: Replace UUID Package with Native Browser API
Replaced the external `uuid` package dependency with a native browser-compatible UUID generation method.

**Before:**
```typescript
import { v4 as uuidv4 } from 'uuid';

static getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(this.SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4(); // ❌ This was causing the error
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }
  return sessionId;
}
```

**After:**
```typescript
private static generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID(); // ✅ Use native browser API when available
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

static getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(this.SESSION_KEY);
  if (!sessionId) {
    sessionId = this.generateUUID(); // ✅ Now works reliably
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }
  return sessionId;
}
```

### Fix 2: Correct SpacetimeDB Event Handler Pattern
Updated the `useTopEarners` hook to use the correct SpacetimeDB event handler cleanup pattern.

**Before:**
```typescript
// Set up reactive listener
const unsubscribe = connection.db.players.onInsert(() => updateTopEarners());
const unsubscribe2 = connection.db.players.onUpdate(() => updateTopEarners());
const unsubscribe3 = connection.db.players.onDelete(() => updateTopEarners());

return () => {
  unsubscribe(); // ❌ These methods don't return unsubscribe functions
  unsubscribe2();
  unsubscribe3();
};
```

**After:**
```typescript
// Set up reactive listeners
connection.db.players.onInsert(updateTopEarners);
connection.db.players.onUpdate(updateTopEarners);
connection.db.players.onDelete(updateTopEarners);

return () => {
  // Clean up listeners using the remove methods
  connection.db.players.removeOnInsert(updateTopEarners); // ✅ Correct cleanup pattern
  connection.db.players.removeOnUpdate(updateTopEarners);
  connection.db.players.removeOnDelete(updateTopEarners);
};
```

## Benefits
1. **Eliminates dependency conflicts**: No more conflicts between multiple uuid package versions
2. **Better performance**: Uses native browser APIs when available
3. **Smaller bundle size**: Removes external dependency for UUID generation
4. **More reliable**: Fallback implementation ensures it works in all browsers
5. **Future-proof**: Uses modern browser APIs with graceful degradation
6. **Proper memory management**: Event listeners are now correctly cleaned up, preventing memory leaks
7. **Follows SpacetimeDB patterns**: Uses the SDK's intended event handler cleanup methods

## Testing
- ✅ GameEntry component now loads without errors
- ✅ Trial mode selection works correctly
- ✅ Session IDs are generated properly
- ✅ No more "TypeError: s is not a function" errors
- ✅ No more "TypeError: unsubscribe is not a function" errors
- ✅ Top Earners section loads correctly on home page
- ✅ Event listeners are properly cleaned up on component unmount

## Files Modified
1. `/lib/utils/sessionManager.ts`: Replaced uuid import with native UUID generation
2. `/hooks/useTopEarners.ts`: Fixed SpacetimeDB event handler cleanup pattern

## Dependencies
The `uuid` package can potentially be removed from package.json if it's not used elsewhere in the codebase, but this change works with or without it.

## SpacetimeDB Event Handler Pattern
For future reference, when working with SpacetimeDB event handlers:
- Use `table.onInsert(callback)`, `table.onUpdate(callback)`, `table.onDelete(callback)` to register handlers
- Use `table.removeOnInsert(callback)`, `table.removeOnUpdate(callback)`, `table.removeOnDelete(callback)` to clean up
- Pass the **same callback reference** to both the registration and cleanup methods
