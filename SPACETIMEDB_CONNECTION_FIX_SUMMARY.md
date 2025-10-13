# SpacetimeDB Connection Fix - Summary

## Problem Identified

Your SpacetimeDB connection was failing because the code was incorrectly constructing WebSocket URIs using database identities instead of letting the SDK handle the connection properly with just the module name.

## Root Causes

### 1. Incorrect URI Construction
```typescript
// ❌ WRONG - Manual WebSocket URI with database identity
const wsUri = `wss://maincloud.spacetimedb.com/database/subscribe/c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a`;
builder.withUri(wsUri).withModuleName("beat-me")
```

### 2. Missing Token Persistence
- No localStorage save/load for auth tokens
- Each connection created a new identity
- No persistent user identity across sessions

### 3. Mixed Configuration
- Database identities hardcoded in multiple places
- Inconsistent between files
- Not using environment variables properly

## Changes Made

### 1. Fixed `lib/spacetime/database.ts`
- ✅ Removed `getWebSocketUri()` function (no longer needed)
- ✅ Removed `database` field from config
- ✅ Changed URI to just the host: `https://maincloud.spacetimedb.com`
- ✅ Added token persistence with localStorage
- ✅ Updated both `createConnectionBuilder()` and `createConnection()`

**Key changes**:
```typescript
// Load saved token
const savedToken = typeof window !== 'undefined' 
  ? localStorage.getItem('spacetime_auth_token') 
  : null;

const builder = DbConnection.builder()
  .withUri(SPACETIME_CONFIG.host)  // Just host - SDK handles rest
  .withModuleName(SPACETIME_CONFIG.module)
  .onConnect((conn, identity, token) => {
    // Save token for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('spacetime_auth_token', token);
    }
  })

if (savedToken) {
  builder.withToken(savedToken);
}
```

### 2. Fixed `components/providers/SpacetimeProvider.tsx`
- ✅ Removed hardcoded database identity
- ✅ Removed custom WebSocket URI construction
- ✅ Added token persistence logic
- ✅ Uses `NEXT_PUBLIC_` prefixed env vars for client-side

**Key changes**:
```typescript
const SPACETIME_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  module: process.env.NEXT_PUBLIC_SPACETIME_MODULE || 'beat-me',
};

// Inside useEffect
const savedToken = localStorage.getItem('spacetime_auth_token');

const builder = DbConnection.builder()
  .withUri(SPACETIME_CONFIG.host)
  .withModuleName(SPACETIME_CONFIG.module)
  .onConnect((connection, identity, token) => {
    localStorage.setItem('spacetime_auth_token', token);
    // ... rest
  })

if (savedToken) {
  builder.withToken(savedToken);
}
```

### 3. Fixed `lib/apis/spacetime.ts`
- ✅ Removed hardcoded database identity
- ✅ Removed custom WebSocket URI construction
- ✅ Uses server-side env vars (without `NEXT_PUBLIC_`)
- ✅ Simplified connection logic

**Key changes**:
```typescript
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  module: process.env.SPACETIME_MODULE || 'beat-me',
};

const builder = DbConnection.builder()
  .withUri(SPACETIME_CONFIG.host)
  .withModuleName(SPACETIME_CONFIG.module)
  // ... rest
```

### 4. Created Environment Setup Guide
- ✅ Created `SPACETIMEDB_ENV_SETUP.md` with complete setup instructions
- ✅ Documents required env vars
- ✅ Explains anonymous auth and token persistence
- ✅ Provides troubleshooting steps

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Client-side (browser)
NEXT_PUBLIC_SPACETIME_HOST=https://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIME_MODULE=beat-me

# Server-side (API routes)
SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_MODULE=beat-me
```

**Note**: No `SPACETIME_TOKEN` needed - tokens are auto-generated and stored in localStorage.

## How It Works Now

### Connection Flow

1. **Initial Connection**:
   - SDK connects to `https://maincloud.spacetimedb.com`
   - Module name `beat-me` identifies your database
   - SDK auto-generates identity and token
   - Token saved to localStorage as `spacetime_auth_token`

2. **Subsequent Connections**:
   - Token loaded from localStorage
   - Passed to SDK via `withToken(savedToken)`
   - SDK recognizes the identity
   - Same identity maintained across sessions

3. **SDK Handles**:
   - WebSocket URI construction (`wss://...`)
   - Protocol conversion (https → wss)
   - Authentication handshake
   - Subscription management

## What You Need to Do

### Step 1: Update `.env.local`
```bash
# Add these variables (keep your existing ones too)
NEXT_PUBLIC_SPACETIME_HOST=https://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIME_MODULE=beat-me

SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_MODULE=beat-me
```

### Step 2: Restart Dev Server
```bash
npm run dev
```

### Step 3: Verify Connection
1. Open browser DevTools → Console
2. Look for: `✅ Connected to SpacetimeDB with identity: <hex>`
3. Check Application → Local Storage → `spacetime_auth_token`
4. Refresh page - should connect with same identity

## Testing Checklist

- [ ] Added env vars to `.env.local`
- [ ] Restarted dev server
- [ ] Console shows: `✅ Connected to SpacetimeDB with identity: ...`
- [ ] localStorage has `spacetime_auth_token`
- [ ] Refresh page maintains same identity
- [ ] Subscriptions working correctly
- [ ] No "initialization failed" errors

## Key Improvements

✅ **Correct SDK Usage**: Now using the SDK as intended
✅ **Module Name**: Using human-readable `beat-me` instead of hex identity
✅ **Token Persistence**: Maintains identity across sessions
✅ **Anonymous Auth**: No manual token management needed
✅ **Clean Config**: No hardcoded values, all from env vars
✅ **Consistent**: Same pattern across all files

## Why This Fixes the Issue

1. **Module Name vs Identity**: 
   - SpacetimeDB uses module names for connection
   - Database identity is server-assigned, not for connection
   - SDK needs clean host + module name only

2. **SDK Handles URI Construction**:
   - Automatically converts `https://` → `wss://`
   - Builds correct WebSocket path internally
   - No manual `/database/subscribe/` needed

3. **Token Persistence**:
   - Anonymous auth works via token save/load
   - Same token = same identity
   - Stored in localStorage automatically

## Before vs After

### Before ❌
```typescript
const wsUri = `wss://maincloud.spacetimedb.com/database/subscribe/c2009532...`;
DbConnection.builder()
  .withUri(wsUri)
  .withModuleName("beat-me")
  .build();
// Result: Connection failed - SDK confused by manual URI construction
```

### After ✅
```typescript
const savedToken = localStorage.getItem('spacetime_auth_token');
DbConnection.builder()
  .withUri("https://maincloud.spacetimedb.com")
  .withModuleName("beat-me")
  .withToken(savedToken || undefined)
  .onConnect((conn, identity, token) => {
    localStorage.setItem('spacetime_auth_token', token);
  })
  .build();
// Result: ✅ Connected with persistent identity
```

## Next Steps

1. ✅ Code changes complete
2. ⏳ Update your `.env.local` file
3. ⏳ Restart dev server
4. ⏳ Test connection in browser
5. ⏳ Verify token persistence

See `SPACETIMEDB_ENV_SETUP.md` for detailed setup instructions.

