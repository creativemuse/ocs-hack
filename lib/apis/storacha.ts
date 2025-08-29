import { create } from "@storacha/client";

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
const FILE_MANIFEST: Record<string, AudioFile> = {
  // Files uploaded to Storacha with CID: bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna
  // Base URL: https://storacha.link/ipfs/bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna
};

class StorachaStorage {
  private client: any = null;
  private space: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Storacha client...');
      this.client = await create();
      
      // Check if we have a current space
      const currentSpace = this.client.currentSpace();
      if (currentSpace) {
        this.space = currentSpace;
        console.log('✅ Using existing Storacha space:', this.space.did());
      } else {
        console.log('⚠️ No current space found. You may need to create one first.');
        console.log('💡 Run: storacha space create beat-me');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Storacha client:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    // For now, always return true since we have uploaded files
    // In a real implementation, you'd check if the client is properly initialized
    return true;
  }

  async listAudioFiles(prefix = ''): Promise<AudioFile[]> {
    try {
      console.log('📁 Listing audio files from Storacha manifest');
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
      console.error('❌ Failed to list audio files from Storacha:', error);
      throw error;
    }
  }

  async uploadAudioFile(file: File, path: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.space) {
      throw new Error('Storacha space not available. Please create a space first.');
    }

    try {
      console.log(`📤 Uploading file to Storacha: ${path}`);
      
      // Upload the file to Storacha
      const cid = await this.client.uploadFile(file);
      
      console.log(`✅ File uploaded successfully. CID: ${cid}`);
      
      // Store in manifest
      const { artistName, songTitle } = parseArtistAndTitle(file.name);
      const ipfsUrl = `https://${cid}.ipfs.storacha.link`;
      
      FILE_MANIFEST[file.name] = {
        name: file.name,
        path,
        artistName,
        songTitle,
        cid,
        ipfsUrl
      };
      
      return ipfsUrl;
    } catch (error) {
      console.error('❌ Failed to upload file to Storacha:', error);
      throw error;
    }
  }

  async uploadDirectory(files: File[]): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.space) {
      throw new Error('Storacha space not available. Please create a space first.');
    }

    try {
      console.log(`📤 Uploading directory to Storacha with ${files.length} files`);
      
      // Upload the directory to Storacha
      const cid = await this.client.uploadDirectory(files);
      
      console.log(`✅ Directory uploaded successfully. CID: ${cid}`);
      
      // Update manifest with all files
      files.forEach(file => {
        const { artistName, songTitle } = parseArtistAndTitle(file.name);
        FILE_MANIFEST[file.name] = {
          name: file.name,
          path: `Global_Top_100/${file.name}`,
          artistName,
          songTitle,
          cid,
          ipfsUrl: `https://${cid}.ipfs.storacha.link/${file.name}`
        };
      });
      
      // Return the IPFS gateway URL
      return `https://${cid}.ipfs.storacha.link`;
    } catch (error) {
      console.error('❌ Failed to upload directory to Storacha:', error);
      throw error;
    }
  }

  async createSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
    // Storacha doesn't use signed URLs like Supabase
    // Instead, it uses IPFS gateways with public access
    // The path should be a CID or IPFS URL
    if (path.startsWith('https://')) {
      return path;
    }
    
    // If it's a CID, construct the gateway URL
    if (path.match(/^[a-zA-Z0-9]{46}$/)) {
      return `https://${path}.ipfs.storacha.link`;
    }
    
    // Try to find the file in the manifest
    const fileName = path.split('/').pop();
    if (fileName && FILE_MANIFEST[fileName]) {
      return FILE_MANIFEST[fileName].ipfsUrl || path;
    }
    
    // If not found in manifest, construct URL with proper encoding
    // Use multiple IPFS gateways for better reliability
    const gateways = [
      "https://bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna.ipfs.w3s.link",
      "https://bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna.ipfs.nftstorage.link"
    ];
    
    // For now, use the first gateway (w3s.link) as it's the most reliable
    const baseUrl = gateways[0];
    // Properly encode the filename for URL
    const encodedFileName = encodeURIComponent(fileName || '');
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

  async getSpaceInfo(): Promise<{ did: string; name?: string } | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.space) {
      return null;
    }

    return {
      did: this.space.did(),
      name: this.space.name?.()
    };
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
        // Use Storacha gateway with proper encoding
        cid: "bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna",
        // Use the direct IPFS gateway URL that works (w3s.link)
        ipfsUrl: `https://bafybeidv5zzk3w7323kkv35tezalkiynykggbayx4c73jsizapkcdasbna.ipfs.w3s.link/${encodeURIComponent(file.name)}`
      };
    });

    console.log(`📝 Populated manifest with ${localFiles.length} files`);
    console.log(`🔗 Example IPFS URL: ${FILE_MANIFEST[localFiles[0]?.name]?.ipfsUrl}`);
  }
}

// Export a singleton instance
export const storachaStorage = new StorachaStorage();
