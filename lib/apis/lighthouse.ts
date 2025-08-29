import lighthouse from '@lighthouse-web3/sdk';

type AudioFile = {
  name: string;
  path: string;
  artistName: string;
  songTitle: string;
  cid?: string;
  ipfsUrl?: string;
};

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

// File manifest to track uploaded files
// In a production app, you'd store this in a database
let FILE_MANIFEST: Record<string, AudioFile> = {};

// Try to load manifest from generated file
try {
  // Load only at runtime on the server to avoid bundler resolution errors
  if (typeof window === 'undefined') {
    const manifestPath = process.cwd() + '/lib/lighthouse-files';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(manifestPath);
    const LIGHTHOUSE_FILES = mod?.LIGHTHOUSE_FILES as Record<string, AudioFile> | undefined;
    if (LIGHTHOUSE_FILES && typeof LIGHTHOUSE_FILES === 'object') {
      FILE_MANIFEST = LIGHTHOUSE_FILES;
      console.log(`📝 Loaded ${Object.keys(FILE_MANIFEST).length} files from lighthouse-files.ts`);
    }
  }
} catch (error) {
  console.log('ℹ️ No lighthouse-files.ts found, using empty manifest');
}

class LighthouseStorage {
  private apiKey: string | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Lighthouse client...');
      
      // Get API key from environment
      this.apiKey = process.env.LIGHTHOUSE_API_KEY || null;
      
      if (!this.apiKey) {
        console.log('⚠️ No Lighthouse API key found. Set LIGHTHOUSE_API_KEY environment variable.');
        return;
      }
      
      console.log('✅ Lighthouse client initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Lighthouse client:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.isInitialized;
  }

  async listAudioFiles(prefix = ''): Promise<AudioFile[]> {
    try {
      console.log('📁 Listing audio files from Lighthouse manifest');
      console.log(`📁 Manifest has ${Object.keys(FILE_MANIFEST).length} files`);
      
      // Return files from the manifest that match the prefix
      const files = Object.values(FILE_MANIFEST);
      console.log(`📁 Total files in manifest: ${files.length}`);
      
      if (prefix) {
        const filteredFiles = files.filter(file => file.path.startsWith(prefix));
        console.log(`📁 Files matching prefix "${prefix}": ${filteredFiles.length}`);
        return filteredFiles;
      }
      return files;
    } catch (error) {
      console.error('❌ Failed to list audio files from Lighthouse:', error);
      throw error;
    }
  }

  async uploadAudioFile(file: File, path: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.apiKey) {
      throw new Error('Lighthouse API key not available. Please set LIGHTHOUSE_API_KEY environment variable.');
    }

    try {
      console.log(`📤 Uploading file to Lighthouse: ${path}`);
      
      // Convert File to buffer for Lighthouse SDK
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // Upload the file to Lighthouse (buffer API)
      const uploadResponse = await lighthouse.uploadBuffer(uint8Array, this.apiKey);
      
      console.log(`✅ File uploaded successfully. Hash: ${uploadResponse.data.Hash}`);
      
      // Store in manifest
      const { artistName, songTitle } = parseArtistAndTitle(file.name);
      const ipfsUrl = `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`;
      
      FILE_MANIFEST[file.name] = {
        name: file.name,
        path,
        artistName,
        songTitle,
        cid: uploadResponse.data.Hash,
        ipfsUrl
      };
      
      return ipfsUrl;
    } catch (error) {
      console.error('❌ Failed to upload file to Lighthouse:', error);
      throw error;
    }
  }

  async uploadDirectory(files: File[]): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.apiKey) {
      throw new Error('Lighthouse API key not available. Please set LIGHTHOUSE_API_KEY environment variable.');
    }

    try {
      console.log(`📤 Uploading directory to Lighthouse with ${files.length} files`);
      
      // Upload files individually and track them
      const uploadPromises = files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        return await lighthouse.uploadBuffer(uint8Array, this.apiKey!);
      });

      const uploadResponses = await Promise.all(uploadPromises);
      
      console.log(`✅ Directory uploaded successfully. ${uploadResponses.length} files processed`);
      
      // Update manifest with all files
      files.forEach((file, index) => {
        const { artistName, songTitle } = parseArtistAndTitle(file.name);
        const uploadResponse = uploadResponses[index]!;
        FILE_MANIFEST[file.name] = {
          name: file.name,
          path: `Global_Top_100/${file.name}`,
          artistName,
          songTitle,
          cid: uploadResponse.data.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`
        };
      });
      
      // Return a generic success message since there's no single directory hash
      return 'https://gateway.lighthouse.storage/ipfs/';
    } catch (error) {
      console.error('❌ Failed to upload directory to Lighthouse:', error);
      throw error;
    }
  }

  async createSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
    // Lighthouse uses IPFS gateways with public access
    // The path should be a CID or IPFS URL
    if (path.startsWith('https://')) {
      return path;
    }
    
    // If it's a CID, construct the gateway URL
    if (path.match(/^[a-zA-Z0-9]{46}$/)) {
      return `https://gateway.lighthouse.storage/ipfs/${path}`;
    }
    
    // Try to find the file in the manifest
    const fileName = path.split('/').pop();
    if (fileName && FILE_MANIFEST[fileName]) {
      return FILE_MANIFEST[fileName].ipfsUrl || path;
    }
    
    // If not found in manifest, construct URL with proper encoding
    // Use multiple IPFS gateways for better reliability
    const gateways = [
      "https://gateway.lighthouse.storage/ipfs",
      "https://ipfs.io/ipfs",
      "https://dweb.link/ipfs"
    ];
    
    // For now, use the first gateway (lighthouse) as it's most reliable for Lighthouse uploads
    const baseUrl = gateways[0];
    // Properly encode the filename for URL
    const encodedFileName = encodeURIComponent(fileName || '');
    
    // If we have a known CID from previous uploads, use it
    if (fileName && FILE_MANIFEST[fileName]?.cid) {
      return `${baseUrl}/${FILE_MANIFEST[fileName].cid}`;
    }
    
    return `${baseUrl}/${encodedFileName}`;
  }

  // Fallback method to get local file path if IPFS fails
  getLocalFallbackUrl(path: string): string | null {
    const fileName = path.split('/').pop();
    if (!fileName) return null;
    
    // Check if we have a local version of this file
    const localFiles = [
      "Chappell Roan - Pink Pony Club.mp3",
      "The Spins.mp3",
      "Pierce The Veil - So Far So Fake.mp3",
      "Travis Scott - HIGHEST IN THE ROOM.mp3",
      "Luke Combs - Fast Car.mp3",
      "Bad Bunny - Tití Me Preguntó.mp3",
      "Ed Sheeran - Perfect.mp3",
      "Radiohead - Creep.mp3",
      "Drake - One Dance.mp3",
      "Chris Stapleton - Tennessee Whiskey.mp3",
      "will.i.am - Scream & Shout.mp3",
      "The Black Eyed Peas - Rock That Body.mp3",
      "Travis Scott - goosebumps  ft. Kendrick Lamar.mp3",
      "The Weeknd - Blinding Lights.mp3",
      "Billie Eilish - Ocean Eyes.mp3",
      "Fuerza Regida - TU SANCHO.mp3",
      "Ed Sheeran - Shape of You.mp3",
      "Bad Bunny - DtMF.mp3",
      "Future - WAIT FOR U.mp3",
      "Taylor Swift - Cruel Summer.mp3",
      "Sabrina Carpenter - Espresso.mp3",
      "NOKIA.mp3",
      "Shaboozey - A Bar Song (Tipsy).mp3",
      "Teddy Swims - Lose Control.mp3",
      "SZA - 30 For 30 feat. Kendrick Lamar.mp3",
      "Billie Eilish - BIRDS OF A FEATHER.mp3",
      "Kendrick Lamar - luther.mp3",
      "Gunna - wgft.mp3",
      "Not Like Us.mp3",
      "Post Malone - I Had Some Help.mp3",
      "ROSÉ & Bruno Mars - APT.mp3",
      "Sabrina Carpenter - Manchild.mp3",
      "Kehlani - Folded.mp3",
      "Lady Gaga, Bruno Mars - Die With A Smile.mp3",
      "BLACKPINK - JUMP.mp3",
      "Chris Brown - It Depends (Audio) ft. Bryson Tiller.mp3",
      "Morgan Wallen, Tate McRae - What I Want.mp3",
      "Justin Beiber-YUKON.mp3",
      "Justin Beiber-DAISIES.mp3",
      "Alex Warren - Ordinary.mp3",
      "Huntrix - Golden.mp3"
    ];
    
    if (localFiles.includes(fileName)) {
      return `/music/${fileName}`;
    }
    
    return null;
  }

  async getStorageInfo(): Promise<{ apiKey: string; status: string } | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.apiKey) {
      return null;
    }

    return {
      apiKey: this.apiKey.substring(0, 10) + '...',
      status: 'connected'
    };
  }

  // Method to refresh manifest from lighthouse-files.ts
  async refreshManifest(): Promise<void> {
    try {
      // Clear require cache to get fresh data
      if (typeof window !== 'undefined') return;
      const manifestPath = process.cwd() + '/lib/lighthouse-files';
      delete require.cache[require.resolve(manifestPath)];
      const { LIGHTHOUSE_FILES } = require(manifestPath);
      if (LIGHTHOUSE_FILES && typeof LIGHTHOUSE_FILES === 'object') {
        FILE_MANIFEST = LIGHTHOUSE_FILES;
        console.log(`🔄 Refreshed manifest with ${Object.keys(FILE_MANIFEST).length} files`);
      }
    } catch (error) {
      console.log('ℹ️ Could not refresh manifest from lighthouse-files.ts');
    }
  }

  // Helper method to populate manifest with local files (for testing)
  async populateManifestFromLocalFiles(): Promise<void> {
    const localFiles = [
      { name: "Chappell Roan - Pink Pony Club.mp3", artistName: "Chappell Roan", songTitle: "Pink Pony Club" },
      { name: "The Spins.mp3", artistName: "Mac Miller", songTitle: "The Spins" },
      { name: "Pierce The Veil - So Far So Fake.mp3", artistName: "Pierce The Veil", songTitle: "So Far So Fake" },
      { name: "Travis Scott - HIGHEST IN THE ROOM.mp3", artistName: "Travis Scott", songTitle: "HIGHEST IN THE ROOM" },
      { name: "Luke Combs - Fast Car.mp3", artistName: "Luke Combs", songTitle: "Fast Car" },
      { name: "Bad Bunny - Tití Me Preguntó.mp3", artistName: "Bad Bunny", songTitle: "Tití Me Preguntó" },
      { name: "Ed Sheeran - Perfect.mp3", artistName: "Ed Sheeran", songTitle: "Perfect" },
      { name: "Radiohead - Creep.mp3", artistName: "Radiohead", songTitle: "Creep" },
      { name: "Drake - One Dance.mp3", artistName: "Drake", songTitle: "One Dance" },
      { name: "Chris Stapleton - Tennessee Whiskey.mp3", artistName: "Chris Stapleton", songTitle: "Tennessee Whiskey" },
      { name: "will.i.am - Scream & Shout.mp3", artistName: "will.i.am", songTitle: "Scream & Shout" },
      { name: "The Black Eyed Peas - Rock That Body.mp3", artistName: "The Black Eyed Peas", songTitle: "Rock That Body" },
      { name: "Travis Scott - goosebumps  ft. Kendrick Lamar.mp3", artistName: "Travis Scott", songTitle: "goosebumps" },
      { name: "The Weeknd - Blinding Lights.mp3", artistName: "The Weeknd", songTitle: "Blinding Lights" },
      { name: "Billie Eilish - Ocean Eyes.mp3", artistName: "Billie Eilish", songTitle: "Ocean Eyes" },
      { name: "Fuerza Regida - TU SANCHO.mp3", artistName: "Fuerza Regida", songTitle: "TU SANCHO" },
      { name: "Ed Sheeran - Shape of You.mp3", artistName: "Ed Sheeran", songTitle: "Shape of You" },
      { name: "Bad Bunny - DtMF.mp3", artistName: "Bad Bunny", songTitle: "DtMF" },
      { name: "Future - WAIT FOR U.mp3", artistName: "Future", songTitle: "WAIT FOR U" },
      { name: "Taylor Swift - Cruel Summer.mp3", artistName: "Taylor Swift", songTitle: "Cruel Summer" },
      { name: "Sabrina Carpenter - Espresso.mp3", artistName: "Sabrina Carpenter", songTitle: "Espresso" },
      { name: "NOKIA.mp3", artistName: "Unknown Artist", songTitle: "NOKIA" },
      { name: "Shaboozey - A Bar Song (Tipsy).mp3", artistName: "Shaboozey", songTitle: "A Bar Song (Tipsy)" },
      { name: "Teddy Swims - Lose Control.mp3", artistName: "Teddy Swims", songTitle: "Lose Control" },
      { name: "SZA - 30 For 30 feat. Kendrick Lamar.mp3", artistName: "SZA", songTitle: "30 For 30" },
      { name: "Billie Eilish - BIRDS OF A FEATHER.mp3", artistName: "Billie Eilish", songTitle: "BIRDS OF A FEATHER" },
      { name: "Kendrick Lamar - luther.mp3", artistName: "Kendrick Lamar", songTitle: "luther" },
      { name: "Gunna - wgft.mp3", artistName: "Gunna", songTitle: "wgft" },
      { name: "Not Like Us.mp3", artistName: "Kendrick Lamar", songTitle: "Not Like Us" },
      { name: "Post Malone - I Had Some Help.mp3", artistName: "Post Malone", songTitle: "I Had Some Help" },
      { name: "ROSÉ & Bruno Mars - APT.mp3", artistName: "ROSÉ & Bruno Mars", songTitle: "APT" },
      { name: "Sabrina Carpenter - Manchild.mp3", artistName: "Sabrina Carpenter", songTitle: "Manchild" },
      { name: "Kehlani - Folded.mp3", artistName: "Kehlani", songTitle: "Folded" },
      { name: "Lady Gaga, Bruno Mars - Die With A Smile.mp3", artistName: "Lady Gaga, Bruno Mars", songTitle: "Die With A Smile" },
      { name: "BLACKPINK - JUMP.mp3", artistName: "BLACKPINK", songTitle: "JUMP" },
      { name: "Chris Brown - It Depends (Audio) ft. Bryson Tiller.mp3", artistName: "Chris Brown", songTitle: "It Depends" },
      { name: "Morgan Wallen, Tate McRae - What I Want.mp3", artistName: "Morgan Wallen, Tate McRae", songTitle: "What I Want" },
      { name: "Justin Beiber-YUKON.mp3", artistName: "Justin Bieber", songTitle: "YUKON" },
      { name: "Justin Beiber-DAISIES.mp3", artistName: "Justin Bieber", songTitle: "DAISIES" },
      { name: "Alex Warren - Ordinary.mp3", artistName: "Alex Warren", songTitle: "Ordinary" },
      { name: "Huntrix - Golden.mp3", artistName: "Huntrix", songTitle: "Golden" }
    ];

    localFiles.forEach(file => {
      FILE_MANIFEST[file.name] = {
        name: file.name,
        path: `Global_Top_100/${file.name}`,
        artistName: file.artistName,
        songTitle: file.songTitle,
        // Use placeholder CID - in practice these would be actual uploaded file hashes
        cid: "QmYourActualFileHashHere",
        // Use Lighthouse gateway with proper encoding
        ipfsUrl: `https://gateway.lighthouse.storage/ipfs/QmYourActualFileHashHere`
      };
    });

    console.log(`📝 Populated manifest with ${localFiles.length} files`);
    console.log(`🔗 Example IPFS URL: ${FILE_MANIFEST[localFiles[0]?.name]?.ipfsUrl}`);
  }
}

// Export a singleton instance
export const lighthouseStorage = new LighthouseStorage();
