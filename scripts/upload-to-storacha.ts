#!/usr/bin/env tsx

import { storachaStorage } from '../lib/apis/storacha';
import fs from 'fs';
import path from 'path';

async function uploadAudioFilesToStoracha() {
  try {
    console.log('🚀 Starting audio file upload to Storacha...');
    
    // Initialize Storacha client
    await storachaStorage.initialize();
    
    if (!storachaStorage.isConfigured()) {
      console.error('❌ Storacha not configured. Please create a space first.');
      console.log('💡 Run: storacha space create beat-me');
      process.exit(1);
    }
    
    // Get space info
    const spaceInfo = await storachaStorage.getSpaceInfo();
    console.log(`📁 Using Storacha space: ${spaceInfo?.did} (${spaceInfo?.name || 'unnamed'})`);
    
    // Read audio files from public/music directory
    const musicDir = path.join(process.cwd(), 'public', 'music');
    if (!fs.existsSync(musicDir)) {
      console.error('❌ Music directory not found:', musicDir);
      process.exit(1);
    }
    
    const files = fs.readdirSync(musicDir)
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => ({
        name: file,
        path: path.join(musicDir, file)
      }));
    
    console.log(`📁 Found ${files.length} audio files to upload`);
    
    if (files.length === 0) {
      console.log('⚠️ No MP3 files found in public/music/');
      process.exit(0);
    }
    
    // Convert files to File objects for Storacha
    const fileObjects: File[] = [];
    
    for (const file of files) {
      const buffer = fs.readFileSync(file.path);
      const fileObject = new File([buffer], file.name, {
        type: 'audio/mpeg',
        lastModified: Date.now()
      });
      fileObjects.push(fileObject);
      console.log(`📦 Prepared: ${file.name}`);
    }
    
    // Upload directory to Storacha
    console.log('📤 Uploading files to Storacha...');
    const cid = await storachaStorage.uploadDirectory(fileObjects);
    
    console.log('✅ Upload successful!');
    console.log(`🔗 IPFS Gateway URL: ${cid}`);
    console.log(`📁 Directory CID: ${cid.split('/').pop()}`);
    
    // Update manifest with the new CIDs
    console.log('📝 Updating file manifest...');
    const baseUrl = cid;
    
    for (const file of files) {
      const { artistName, songTitle } = parseArtistAndTitle(file.name);
      console.log(`  • ${file.name} -> ${baseUrl}/${file.name}`);
    }
    
    console.log('\n🎉 All files uploaded successfully!');
    console.log('💡 You can now use the Storacha API route: /api/storacha-questions');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

function parseArtistAndTitle(filename: string): { artistName: string; songTitle: string } {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artistName: parts[0]!.trim(), songTitle: parts.slice(1).join(' - ').trim() };
  }
  const under = base.split('_');
  if (under.length >= 2) {
    return { artistName: under[0]!.trim(), songTitle: under.slice(1).join(' ').trim() };
  }
  return { artistName: 'Unknown', songTitle: base.trim() || 'Unknown' };
}

// Run the upload
uploadAudioFilesToStoracha();
