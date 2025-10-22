# 🚀 Lighthouse Storage Integration Guide

This document explains how to use Lighthouse IPFS storage for audio files in your trivia game.

## 📋 Setup Complete ✅

Your project is now configured with:
- ✅ Lighthouse SDK installed (`@lighthouse-web3/sdk` v0.4.1)
- ✅ API wrapper (`lib/apis/lighthouse.ts`)
- ✅ Questions endpoint (`/api/lighthouse-questions/`)
- ✅ Audio player with IPFS gateway fallbacks
- ✅ Upload script for batch file uploads
- ✅ Status monitoring endpoint

## 🔧 Configuration

### Environment Variables
Make sure you have your Lighthouse API key set:
```bash
export LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here
```

### Check Configuration Status
```bash
# Start your dev server
npm run dev

# Check Lighthouse status
npm run lighthouse:status
# or visit: http://localhost:3000/api/lighthouse-status
```

## 📤 Uploading Audio Files

### Method 1: Batch Upload Script
Upload all your music files to Lighthouse IPFS:

```bash
# Install dependencies first
npm install

# Upload all MP3 files from public/music/ to Lighthouse
npm run lighthouse:upload
```

This will:
1. 📤 Upload each MP3 file to Lighthouse IPFS
2. 🏷️ Generate CIDs for each file
3. 📝 Create `lighthouse-manifest.json` with upload results
4. 🎯 Generate `lib/lighthouse-files.ts` with TypeScript constants
5. 🔄 Auto-refresh your app's file manifest

### Method 2: Manual Upload via API
```typescript
import { lighthouseStorage } from '@/lib/apis/lighthouse';

// Upload a single file
const file = new File([audioBuffer], 'song.mp3', { type: 'audio/mpeg' });
const ipfsUrl = await lighthouseStorage.uploadAudioFile(file, 'Global_Top_100/song.mp3');
console.log('File available at:', ipfsUrl);
```

## 🎵 How It Works

### File Flow
```
Local Files → Lighthouse Upload → IPFS Storage → Gateway URLs → Audio Player
     ↓              ↓                 ↓              ↓            ↓
   MP3 Files    Generate CID    Distributed     Multiple      Playback
                                 Storage       Gateways      with Fallback
```

### Gateway Fallback System
Your AudioPlayer now uses multiple IPFS gateways for reliability:
1. `https://gateway.lighthouse.storage/ipfs/` (Primary)
2. `https://ipfs.io/ipfs/` (Fallback 1)  
3. `https://dweb.link/ipfs/` (Fallback 2)
4. Local files (Final fallback)

## 📊 Monitoring & Management

### Check Upload Status
```bash
curl http://localhost:3000/api/lighthouse-status
```

Response:
```json
{
  "status": "success",
  "configured": true,
  "files": 42,
  "storageInfo": {
    "apiKey": "abc123...",
    "status": "connected"
  },
  "sampleFiles": [
    {
      "name": "Ed Sheeran - Shape of You.mp3",
      "artist": "Ed Sheeran",
      "title": "Shape of You",
      "hasIPFS": true
    }
  ]
}
```

### Refresh File Manifest
```bash
curl -X POST http://localhost:3000/api/lighthouse-status \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh-manifest"}'
```

## 🎮 Game Integration

### Using Lighthouse Questions
Your game will automatically use Lighthouse-stored files:

```typescript
// Fetch questions from Lighthouse storage
const response = await fetch('/api/lighthouse-questions?count=5&difficulty=medium');
const { questions } = await response.json();

// Questions now include IPFS URLs:
// {
//   audioUrl: "https://gateway.lighthouse.storage/ipfs/QmYourFileHashHere",
//   metadata: { source: "lighthouse", artistName: "...", songTitle: "..." }
// }
```

### Question Sources Priority
1. 🚀 **Lighthouse IPFS** (if configured and files uploaded)
2. 📁 **Local files** (fallback from `public/music/`)

## 🔧 Advanced Features

### IPNS Support (Optional)
For mutable file references, you can use IPNS:

```typescript
// Generate IPNS key
const keyResponse = await lighthouse.generateKey(apiKey);

// Publish content to IPNS
await lighthouse.publishRecord(ipfsHash, keyResponse.data.ipnsName, apiKey);

// Access via: https://gateway.lighthouse.storage/ipns/k51qzi5uqu5d...
```

### File Metadata Management
The system automatically extracts metadata from filenames:
- `"Artist - Song Title.mp3"` → `{ artistName: "Artist", songTitle: "Song Title" }`
- `"Artist_Song_Title.mp3"` → `{ artistName: "Artist", songTitle: "Song Title" }`

## 🚨 Troubleshooting

### Common Issues

**1. "API key not configured"**
```bash
# Set your API key
export LIGHTHOUSE_API_KEY=your_key_here
# Restart your dev server
npm run dev
```

**2. "Audio failed to load"**
- Check IPFS gateway connectivity
- Verify file was uploaded successfully  
- Check browser console for CORS errors
- Try different gateway in AudioPlayer

**3. "No files found in manifest"**
```bash
# Re-upload files
npm run lighthouse:upload

# Or refresh manifest
curl -X POST http://localhost:3000/api/lighthouse-status \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh-manifest"}'
```

### Debug Mode
Enable detailed logging:
```bash
DEBUG=lighthouse:* npm run dev
```

## 📈 Performance Tips

1. **Batch Uploads**: Upload files in small batches (3-5 at a time)
2. **Gateway Selection**: Lighthouse gateway is typically fastest for Lighthouse uploads
3. **Preloading**: AudioPlayer uses `preload="auto"` for faster start times
4. **Fallback Strategy**: Multiple gateways ensure high availability

## 🔗 Useful Links

- [Lighthouse Documentation](https://docs.lighthouse.storage/)
- [IPFS Gateway Status](https://ipfs.github.io/public-gateway-checker/)
- [Lighthouse Dashboard](https://files.lighthouse.storage/) (view your uploads)

## 📋 Next Steps

1. ✅ Upload your audio files: `npm run lighthouse:upload`
2. ✅ Test playback in your game
3. ✅ Monitor upload status and file availability
4. 🚀 Deploy with environment variables configured

Your Lighthouse integration is ready! 🎉
