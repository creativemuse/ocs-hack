# Deployment Guide: Fixing Image Display on Vercel

## Problem
Images now use relative paths (`/assets/...`) which work in both development and production environments.

## Solution Implemented
We've created a flexible asset configuration system that adapts to different environments.

### Files Modified
1. **`lib/config/assets.ts`** - New centralized asset configuration
2. **`next.config.ts`** - Updated to support production domains
3. **`app/page.tsx`** - Replaced hardcoded URLs with dynamic assets
4. **`app/game/page.tsx`** - Replaced hardcoded URLs with dynamic assets

## Deployment Options

### Option 1: Use a CDN (Recommended)
1. Upload your assets to a CDN (e.g., Cloudflare, AWS CloudFront, Vercel)
2. Set environment variables in Vercel:
   ```
   NEXT_PUBLIC_ASSET_BASE_URL=https://your-cdn-domain.com
   ASSET_BASE_URL=https://your-cdn-domain.com
   ```
3. Update `next.config.ts` remotePatterns:
   ```typescript
   {
     protocol: "https",
     hostname: "your-cdn-domain.com",
     pathname: "/assets/**",
   }
   ```

### Option 2: Use Next.js Public Folder
1. Copy your assets from the external server to `public/assets/`
2. Set environment variables:
   ```
   NEXT_PUBLIC_ASSET_BASE_URL=
   ASSET_BASE_URL=
   ```
3. No additional Next.js config needed (public folder is automatically served)

### Option 3: Custom Asset Server
1. Deploy your asset server separately
2. Set environment variables:
   ```
   NEXT_PUBLIC_ASSET_BASE_URL=https://your-asset-server.com
   ASSET_BASE_URL=https://your-asset-server.com
   ```
3. Update `next.config.ts` remotePatterns with your server domain

## Vercel Deployment Steps

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project settings
   - Add the appropriate environment variables based on your chosen option

2. **Update Next.js Config (if using external domains):**
   - Uncomment and modify the remotePatterns in `next.config.ts`
   - Add your production domain

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Fix asset URLs for production deployment"
   git push
   ```

## Testing
- Development: Images work with relative paths from `/public/assets/`
- Production: Images will use your configured production URLs

## Asset Files Referenced
The following assets need to be available in production:
- `ee18a2a9ff718cdd3a3c134be489bc60e2c5e9ca.png`
- `da9c677496caf9618e632f752b62514b0a775282.png`
- `645a99fbb2ba303dd63b4c02f0f5b11be38939f9.png`
- `09698eb6a0c157f4f2cf590a6a4d663b0d76adb7.png`
- `3181aa949007403d2e43ef28c36519e1b766d296.png`
- `0cb6c409a89ea59f28fddeab9e5fa68185f7de85.png`
- `8eb09bb788a1cf5563f16634d8bd9b5d1b863ef9.png`
- `301abc372de26b14e2b7f5a56beb6368be51039e.svg`
- `be82fbbfc82dbf546440e6b90de8b6aaee39a992.svg`
- `cfc305dd8cf03fc40f5cc7683a1ae9871ccb7440.png`
- `5ab9a61a534bd0769868dcf4132c8d1c2e0d18dc.svg`
- `4f728f2c86986f7c84521056d149c0b6892a11e8.svg`
