# MiniKit Integration Guide

This document describes the integration of Coinbase OnchainKit MiniKit components into the BEAT ME application.

## Overview

MiniKit provides enhanced functionality when the app is accessed through Farcaster Mini Apps, including:
- **AutoConnect**: Automatic wallet connection within Farcaster
- **SafeArea**: Proper handling of device notches and navigation bars
- **IfInMiniApp**: Conditional rendering based on Mini App context
- **Mini App Actions**: Share and pin functionality

## Components Added

### 1. MiniKitLayout (`components/minikit/MiniKitLayout.tsx`)

A wrapper component that provides:
- Automatic wallet connection via `AutoConnect`
- Safe area handling for device UI elements
- Conditional layouts for web vs Mini App experiences

```tsx
import { MiniKitLayout } from '@/components/minikit';

// Used in app/layout.tsx
<MiniKitLayout>
  {children}
</MiniKitLayout>
```

**Features:**
- Web: Standard full-screen layout
- Mini App: Adds header with branding and safe area padding

### 2. MiniAppActions (`components/minikit/MiniAppActions.tsx`)

Provides Mini App-specific actions:
- "Add to Farcaster" button (pins the app)
- Only visible when running in Farcaster

```tsx
import { MiniAppActions } from '@/components/minikit';

// Added to game completion screen
<MiniAppActions />
```

## Configuration Changes

### app/rootProvider.tsx

**Changes:**
1. Added `miniKit={{ enabled: true }}` to `OnchainKitProvider`
2. Configured Coinbase Wallet connector with `preference: 'smartWalletOnly'` for optimal Mini App experience
3. Kept existing Mini App SDK ready call for compatibility

```tsx
<OnchainKitProvider
  miniKit={{ enabled: true }}
  // ... other config
>
```

### app/layout.tsx

**Changes:**
1. Imported `MiniKitLayout`
2. Wrapped children with `MiniKitLayout` component

```tsx
<RootProvider>
  <MiniKitLayout>
    {children}
  </MiniKitLayout>
</RootProvider>
```

### app/game/page.tsx

**Changes:**
1. Added `MiniAppActions` component to game completion screen
2. Component appears after social sharing section

## How It Works

### 1. Automatic Connection (AutoConnect)

When a user opens BEAT ME in Farcaster:
- `AutoConnect` detects the Farcaster environment
- Automatically connects to the user's Coinbase Wallet
- No manual wallet selection needed

### 2. Safe Area Handling (SafeArea)

The `SafeArea` component:
- Detects device safe area insets (notches, home indicators)
- Applies appropriate padding via CSS custom properties
- Prevents content from being obscured by system UI

CSS Variables exposed:
- `--ock-minikit-safe-area-inset-top`
- `--ock-minikit-safe-area-inset-right`
- `--ock-minikit-safe-area-inset-bottom`
- `--ock-minikit-safe-area-inset-left`

### 3. Conditional Rendering (IfInMiniApp)

Components wrapped in `IfInMiniApp`:
- **Inside Farcaster**: Renders children
- **Outside Farcaster**: Renders fallback (or nothing)

Example usage:
```tsx
<IfInMiniApp
  fallback={<WebOnlyComponent />}
>
  <MiniAppSpecificComponent />
</IfInMiniApp>
```

### 4. Mini App Actions

The `MiniAppActions` component provides:
- **Add to Farcaster**: Pins the app for quick access
- Uses `useAddFrame()` hook from OnchainKit
- Only visible in Mini App context

## Testing

### Local Testing
1. Run the app locally: `npm run dev`
2. App works normally in browser
3. All Mini App components gracefully degrade

### Farcaster Testing
1. Deploy to production/staging
2. Access via Farcaster client
3. Verify:
   - Automatic wallet connection
   - Proper safe area padding
   - "Add to Farcaster" button appears
   - Mini App header shows

## Frame Configuration

The app's Farcaster frame configuration is in:
- `public/.well-known/farcaster.json`
- `app/layout.tsx` (metadata)

Key settings:
```json
{
  "frame": {
    "version": "1",
    "name": "BEAT ME",
    "homeUrl": "https://beatme.creativeplatform.xyz",
    "iconUrl": "https://beatme.creativeplatform.xyz/icon.png",
    "splashImageUrl": "https://beatme.creativeplatform.xyz/splash.png"
  }
}
```

## Benefits

1. **Seamless Experience**: Auto-connection removes friction
2. **Better UX**: Safe area handling prevents UI issues
3. **Social Integration**: Easy sharing and pinning
4. **Progressive Enhancement**: Works on both web and Farcaster
5. **Brand Consistency**: Custom Mini App header maintains identity

## Requirements

- OnchainKit v1.1.0 or higher
- Properly configured Farcaster frame manifest
- Valid Coinbase CDP project ID and API key

## Related Files

- `/components/minikit/MiniKitLayout.tsx`
- `/components/minikit/MiniAppActions.tsx`
- `/components/minikit/index.ts`
- `/app/rootProvider.tsx`
- `/app/layout.tsx`
- `/app/game/page.tsx`
- `/public/.well-known/farcaster.json`

## Additional Resources

- [OnchainKit MiniKit Docs](https://onchainkit.xyz/minikit/overview)
- [Farcaster Frames Spec](https://docs.farcaster.xyz/learn/what-is-farcaster/frames)
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)

