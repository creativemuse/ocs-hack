# Lighthouse Storage Setup

This project has been migrated from Storacha to Lighthouse Storage for better audio playback performance.

## Setup Instructions

1. **Get a Lighthouse API Key**
   - Visit [lighthouse.storage](https://lighthouse.storage)
   - Create an account and log in
   - Navigate to the API Key section to generate your key

2. **Configure Environment Variables**
   Add the following to your `.env.local` file:
   ```
   LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here
   ```

3. **Upload Audio Files (Optional)**
   If you want to upload your audio files to Lighthouse:
   ```bash
   npm run upload-to-lighthouse
   ```

## Features

- **Perpetual Storage**: Pay once to store your data indefinitely
- **Dedicated IPFS Gateways**: Fast retrievals, including high-speed 4K video streaming
- **Encryption & Access Control**: Secure your data with advanced encryption
- **Decentralized**: Built on IPFS and Filecoin for true decentralization

## API Endpoints

- `/api/lighthouse-questions` - Generates trivia questions using Lighthouse storage
- Fallback to local files if Lighthouse is not configured

## Storage Structure

Audio files are stored with the following structure:
- **CID**: Unique content identifier on IPFS
- **Gateway URL**: `https://gateway.lighthouse.storage/ipfs/{CID}`
- **Metadata**: Artist name, song title, and file information

## Troubleshooting

1. **API Key Issues**: Ensure your `LIGHTHOUSE_API_KEY` is set correctly
2. **Network Issues**: Lighthouse uses IPFS gateways which may have varying performance
3. **Fallback**: The system automatically falls back to local files if Lighthouse is unavailable

## Migration from Storacha

The migration includes:
- New Lighthouse storage API (`/lib/apis/lighthouse.ts`)
- Updated API endpoint (`/api/lighthouse-questions`)
- Maintained compatibility with existing game logic
- Automatic fallback to local files
