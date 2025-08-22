# Supabase Configuration Guide

## Current Issue
The application is showing warnings because Supabase environment variables are not configured. The app falls back to local files, which works but generates console warnings.

## Environment Variables Needed

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## How to Get Supabase Credentials

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be ready

2. **Get Your Credentials:**
   - Go to Project Settings → API
   - Copy the following values:
     - **Project URL** → `SUPABASE_URL`
     - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (optional, for admin operations)

3. **Set Up Storage:**
   - Go to Storage in your Supabase dashboard
   - Create a bucket named `Songs`
   - Set bucket permissions to allow public access (for signed URLs)
   - Create a folder named `Global_Top_100`
   - Upload your audio files (format: "Artist - Song Title.mp3")

## Uploading Files to Supabase

### Option 1: Manual Upload via Dashboard
1. Go to Storage → Songs → Global_Top_100
2. Click "Upload files"
3. Select your MP3 files
4. Ensure files are named as "Artist - Song Title.mp3"

### Option 2: Upload Local Files
If you have files in `public/music/`, you can upload them to Supabase:

1. **Using Supabase CLI (Recommended):**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Upload files
   supabase storage upload Songs/Global_Top_100 public/music/*.mp3
   ```

2. **Using the Dashboard:**
   - Copy files from `public/music/` to your computer
   - Upload them via the Supabase dashboard

### Option 3: Programmatic Upload
You can create a script to upload files:

```typescript
// upload-to-supabase.ts
import { SupabaseStorage } from '@/lib/apis/supabase';
import fs from 'fs';
import path from 'path';

async function uploadFiles() {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
  
  for (const file of files) {
    const filePath = path.join(musicDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('Songs')
      .upload(`Global_Top_100/${file}`, fileBuffer);
      
    if (error) {
      console.error(`Failed to upload ${file}:`, error);
    } else {
      console.log(`✅ Uploaded ${file}`);
    }
  }
}
```

## Current Behavior

- **With Supabase configured and files uploaded:** Uses Supabase storage for audio files
- **With Supabase configured but empty bucket:** Falls back to local files with informative message
- **Without Supabase configured:** Uses local files from `public/music/` (current behavior)
- **No more warnings:** The app now gracefully handles all scenarios

## Benefits of Using Supabase

1. **Scalability:** Handle more audio files without bloating your repository
2. **Performance:** CDN-backed storage for faster audio loading
3. **Management:** Easy to add/remove songs through Supabase dashboard
4. **Cost-effective:** Generous free tier for storage and bandwidth

## Testing

After setting up Supabase:
1. Restart your development server
2. Check the console - you should see "Found X audio files in Supabase"
3. The game should work with Supabase-stored audio files

## Troubleshooting

- **"Supabase bucket is empty"**: Upload files to the Songs/Global_Top_100 folder
- **"Supabase not configured"**: Check your .env.local file has the correct variables
- **"Bucket access failed"**: Check bucket permissions and RLS policies
