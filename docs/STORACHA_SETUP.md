# Storacha Integration Guide

This guide will help you migrate from Supabase storage to Storacha for decentralized, IPFS-powered audio file storage.

## 🚀 What is Storacha?

Storacha is a decentralized storage solution built on IPFS that provides:
- **Decentralized storage** - No single point of failure
- **Censorship resistance** - Content can't be taken down
- **Global CDN** - Fast access worldwide through IPFS gateways
- **Cost-effective** - Pay only for what you use
- **Developer-friendly** - Simple API and CLI tools

## 📋 Prerequisites

- Node.js 22+ and npm 7+ (✅ You have: Node v22.18.0, npm v10.9.3)
- Storacha CLI installed
- Email address for Storacha account

## 🔧 Installation & Setup

### 1. Install Storacha CLI

```bash
npm install -g @storacha/cli
```

### 2. Login to Storacha

```bash
storacha login your-email@example.com
```

You'll receive a confirmation email. Click the link to verify your account.

### 3. Create a Space

```bash
storacha space create beat-me
```

This creates a unique space for your audio files. The space will be automatically set as your current space.

### 4. Verify Setup

```bash
storacha space list
```

You should see your newly created space listed.

## 📁 Uploading Audio Files

### Option 1: Using the Upload Script (Recommended)

We've created a utility script to upload all your audio files:

```bash
# Run the upload script
npx tsx scripts/upload-to-storacha.ts
```

### Option 2: Manual Upload

```bash
# Upload individual files
storacha upload public/music/song1.mp3

# Upload entire directory
storacha upload public/music/

# Or upload to your beat-me space specifically
storacha upload public/music/ --space beat-me
```

### Option 3: Using the Storacha API

You can also upload files programmatically using the Storacha client:

```typescript
import { storachaStorage } from '@/lib/apis/storacha';

// Upload a single file
const file = new File([audioBuffer], 'song.mp3', { type: 'audio/mpeg' });
const url = await storachaStorage.uploadAudioFile(file, 'Global_Top_100/song.mp3');

// Upload multiple files
const files = [file1, file2, file3];
const url = await storachaStorage.uploadDirectory(files);
```

## 🎮 Using the New API

### API Endpoint

The new Storacha-powered API is available at:
```
GET /api/storacha-questions
```

### Parameters

- `folder` - Directory name (default: "Global_Top_100")
- `mode` - Question type: "name-that-tune" or "artist-match"
- `count` - Number of questions (1-20)
- `choices` - Number of answer choices (2-6)
- `difficulty` - Difficulty level: "easy", "medium", "hard", "expert"

### Example Request

```bash
curl "http://localhost:3000/api/storacha-questions?mode=name-that-tune&count=5&difficulty=medium"
```

### Response Format

```json
{
  "questions": [
    {
      "id": "st_1234567890_0",
      "type": "name-that-tune",
      "question": "What song is this?",
      "options": ["Song A", "Song B", "Song C", "Song D"],
      "correctAnswer": 0,
      "audioUrl": "https://bafybeih...ipfs.storacha.link/song.mp3",
      "timeLimit": 15,
      "difficulty": "medium",
      "metadata": {
        "artistName": "Artist Name",
        "songTitle": "Song Title",
        "source": "storacha"
      }
    }
  ],
  "count": 1,
  "difficulty": "medium",
  "mode": "name-that-tune",
  "source": "storacha",
  "folder": "Global_Top_100"
}
```

## 🎮 Main Game Integration

The Storacha implementation is now **fully integrated** into the main game! 

- **Game Page**: http://localhost:3000/game
- **API Endpoint**: `/api/storacha-questions`
- **Storage**: Decentralized IPFS via Storacha

## ✅ Current Setup Status

Your Storacha implementation is now **fully operational**! 

- **Space Name**: `beat-me`
- **Files Uploaded**: 41 audio files (0.4GB)
- **IPFS CID**: `bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna`
- **Gateway URL**: `https://storacha.link/ipfs/bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna`
- **API Status**: ✅ Working with IPFS URLs
- **Main Game**: ✅ Using Storacha storage

## 🔄 Migration from Supabase

### What's Changed

1. **Storage Provider**: Supabase → Storacha/IPFS ✅ **COMPLETED**
2. **URL Format**: Signed URLs → IPFS Gateway URLs ✅ **COMPLETED**
3. **File Management**: Database-driven → Manifest-based ✅ **COMPLETED**
4. **API Route**: `/api/supabase-questions` → `/api/storacha-questions` ✅ **COMPLETED**
5. **Main Game**: Now uses Storacha storage ✅ **COMPLETED**

### File Structure

```
lib/apis/
├── supabase.ts          # Original Supabase implementation
├── storacha.ts          # New Storacha implementation
└── ...

app/api/
├── supabase-questions/  # Original API route
├── storacha-questions/  # New API route
└── ...

components/game/
├── SupabaseTriviaGame.tsx  # Original component
├── StorachaTriviaGame.tsx  # New component
└── ...

app/
├── game/               # Original game page
├── storacha-demo/      # New demo page
└── ...
```

### Backward Compatibility

The original Supabase implementation remains intact. You can:
- Keep using the old API: `/api/supabase-questions`
- Use the new API: `/api/storacha-questions`
- Run both implementations side by side

## 🛠️ Development Workflow

### 1. Local Development

For local development, the system falls back to local files:

```typescript
// Uses local files from public/music/
const response = await fetch('/api/storacha-questions');
```

### 2. Production with Storacha

For production with uploaded files:

```typescript
// Uses IPFS gateway URLs
const response = await fetch('/api/storacha-questions');
// audioUrl: "https://bafybeih...ipfs.storacha.link/song.mp3"
```

### 3. File Manifest

The system uses a file manifest to track uploaded files:

```typescript
const FILE_MANIFEST = {
  "song.mp3": {
    name: "song.mp3",
    path: "Global_Top_100/song.mp3",
    artistName: "Artist",
    songTitle: "Song",
    cid: "bafybeih...",
    ipfsUrl: "https://bafybeih...ipfs.storacha.link"
  }
};
```

## 🔍 Troubleshooting

### Common Issues

1. **"Storacha space not available"**
   ```bash
   storacha space create my-space
   storacha space use my-space
   ```

2. **"No current space found"**
   ```bash
   storacha space list
   storacha space use <space-did>
   ```

3. **Upload fails**
   ```bash
   storacha login your-email@example.com
   storacha plan wait  # Wait for payment plan selection
   ```

4. **Files not loading**
   - Check if files are uploaded: `storacha list`
   - Verify gateway URLs work in browser
   - Check network connectivity

### Debug Commands

```bash
# Check Storacha status
storacha status

# List spaces
storacha space list

# List files in current space
storacha list

# Check account status
storacha account
```

## 🚀 Production Deployment

### Environment Variables

No additional environment variables needed for Storacha! The client handles authentication automatically.

### Vercel Deployment

1. Upload files to Storacha before deployment
2. Deploy your Next.js app normally
3. The API will use IPFS gateway URLs in production

### Monitoring

Monitor your Storacha usage:
```bash
storacha usage
storacha billing
```

## 🎉 Benefits of Storacha

### ✅ Advantages

- **Decentralized**: No single point of failure
- **Censorship-resistant**: Content can't be taken down
- **Global CDN**: Fast access worldwide
- **Cost-effective**: Pay only for storage and bandwidth
- **Developer-friendly**: Simple API and CLI
- **Future-proof**: Built on IPFS protocol

### ⚠️ Considerations

- **Initial setup**: Requires account creation and space setup
- **Learning curve**: New concepts (IPFS, CIDs, gateways)
- **File management**: Need to maintain file manifest
- **Gateway dependency**: Relies on IPFS gateways for access

## 📚 Additional Resources

- [Storacha Documentation](https://docs.storacha.com)
- [IPFS Documentation](https://docs.ipfs.io)
- [Storacha CLI Reference](https://docs.storacha.com/cli)
- [IPFS Gateway List](https://ipfs.github.io/public-gateway-checker/)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Storacha documentation
3. Check IPFS gateway status
4. Verify your account and payment plan

---

**Happy coding with decentralized storage! 🚀**
