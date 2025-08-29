#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import lighthouse from '@lighthouse-web3/sdk';

interface UploadResult {
  fileName: string;
  cid: string;
  ipfsUrl: string;
  artistName: string;
  songTitle: string;
  success: boolean;
  error?: string;
}

const parseArtistAndTitle = (filename: string): { artistName: string; songTitle: string } => {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artistName: parts[0]!.trim(), songTitle: parts.slice(1).join(' - ').trim() };
  }
  // Fallback: try "Artist_Title"
  const under = base.split('_');
  if (under.length >= 2) {
    return { artistName: under[0]!.trim(), songTitle: under.slice(1).join(' ').trim() };
  }
  return { artistName: 'Unknown', songTitle: base.trim() || 'Unknown' };
};

const uploadToLighthouse = async (filePath: string, fileName: string): Promise<UploadResult> => {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    throw new Error('LIGHTHOUSE_API_KEY environment variable is required');
  }

  try {
    console.log(`📤 Uploading ${fileName}...`);
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Lighthouse using buffer API (filename is not a parameter here)
    const uploadResponse = await lighthouse.uploadBuffer(fileBuffer, apiKey);
    
    console.log(`✅ Uploaded ${fileName} - CID: ${uploadResponse.data.Hash}`);
    
    const { artistName, songTitle } = parseArtistAndTitle(fileName);
    const ipfsUrl = `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`;
    
    return {
      fileName,
      cid: uploadResponse.data.Hash,
      ipfsUrl,
      artistName,
      songTitle,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error);
    const { artistName, songTitle } = parseArtistAndTitle(fileName);
    
    return {
      fileName,
      cid: '',
      ipfsUrl: '',
      artistName,
      songTitle,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const main = async () => {
  const musicDir = path.join(process.cwd(), 'public/music');
  
  if (!fs.existsSync(musicDir)) {
    console.error('❌ Music directory not found at public/music');
    process.exit(1);
  }
  
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    console.error('❌ LIGHTHOUSE_API_KEY environment variable is required');
    console.log('Set it with: export LIGHTHOUSE_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  console.log('🚀 Starting Lighthouse upload process...');
  console.log(`📁 Scanning directory: ${musicDir}`);
  
  // Get all MP3 files
  const files = fs.readdirSync(musicDir)
    .filter(file => file.toLowerCase().endsWith('.mp3'))
    .sort();
  
  console.log(`🎵 Found ${files.length} MP3 files to upload`);
  
  if (files.length === 0) {
    console.log('ℹ️ No MP3 files found in public/music directory');
    process.exit(0);
  }
  
  const results: UploadResult[] = [];
  const batchSize = 3; // Upload 3 files at a time to avoid rate limits
  
  // Process files in batches
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
    
    const batchPromises = batch.map(fileName => {
      const filePath = path.join(musicDir, fileName);
      return uploadToLighthouse(filePath, fileName);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < files.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    failed.forEach(result => {
      console.log(`   - ${result.fileName}: ${result.error}`);
    });
  }
  
  // Generate manifest file
  const manifestPath = path.join(process.cwd(), 'lighthouse-manifest.json');
  const manifest = successful.reduce((acc, result) => {
    acc[result.fileName] = {
      name: result.fileName,
      path: `Global_Top_100/${result.fileName}`,
      artistName: result.artistName,
      songTitle: result.songTitle,
      cid: result.cid,
      ipfsUrl: result.ipfsUrl
    };
    return acc;
  }, {} as Record<string, any>);
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📝 Generated manifest file: ${manifestPath}`);
  
  // Generate TypeScript constants file
  const constantsPath = path.join(process.cwd(), 'lib/lighthouse-files.ts');
  const constantsContent = `// Auto-generated Lighthouse file manifest
// Generated on ${new Date().toISOString()}

export const LIGHTHOUSE_FILES = ${JSON.stringify(manifest, null, 2)} as const;

export type LighthouseFile = {
  name: string;
  path: string;
  artistName: string;
  songTitle: string;
  cid: string;
  ipfsUrl: string;
};

export const getLighthouseFiles = (): LighthouseFile[] => {
  return Object.values(LIGHTHOUSE_FILES);
};

export const getLighthouseFileByName = (fileName: string): LighthouseFile | undefined => {
  return LIGHTHOUSE_FILES[fileName];
};

export const getLighthouseFilesByCID = (): Record<string, LighthouseFile> => {
  const result: Record<string, LighthouseFile> = {};
  Object.values(LIGHTHOUSE_FILES).forEach(file => {
    result[file.cid] = file;
  });
  return result;
};
`;
  
  fs.writeFileSync(constantsPath, constantsContent);
  console.log(`📝 Generated TypeScript constants: ${constantsPath}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Upload completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Update your Lighthouse API to use the generated manifest');
    console.log('2. Test playback with the new IPFS URLs');
    console.log('3. Consider implementing IPNS for mutable references');
    
    console.log('\n🔗 Example IPFS URLs:');
    successful.slice(0, 3).forEach(result => {
      console.log(`   ${result.artistName} - ${result.songTitle}`);
      console.log(`   ${result.ipfsUrl}`);
    });
  }
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { uploadToLighthouse, parseArtistAndTitle };
