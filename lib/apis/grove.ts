/**
 * Lens Grove Storage Client
 * 
 * Priority storage provider for audio files using Grove's EVM-based access control.
 * Gateway: https://api.grove.storage/
 * 
 * Features:
 * - Immutable content with Base chain ACL
 * - Public read access
 * - File manifest tracking
 * - Local fallback support
 */

import { logger } from '@/lib/utils/logger';

const GROVE_GATEWAY_URL = 'https://api.grove.storage';
const BASE_CHAIN_ID = 8453; // Base mainnet

type AudioFile = {
    name: string;
    path: string;
    artistName: string;
    songTitle: string;
    storageKey?: string;
    gatewayUrl?: string;
    uri?: string; // Lens URI format: lens://...
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
// In production, this could be stored in a database
let FILE_MANIFEST: Record<string, AudioFile> = {};

class GroveStorage {
    private apiKey: string | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            logger.debug('🌳 Initializing Grove storage client...');

            // Get API key from environment
            this.apiKey = process.env.GROVE_API_KEY || null;

            if (!this.apiKey) {
                logger.info('ℹ️ No Grove API key found. Set GROVE_API_KEY environment variable.');
                return;
            }

            logger.info('✅ Grove storage client initialized successfully');
            this.isInitialized = true;
        } catch (error) {
            logger.error('❌ Failed to initialize Grove storage client:', error);
            throw error;
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== null && this.isInitialized;
    }

    async listAudioFiles(prefix = ''): Promise<AudioFile[]> {
        try {
            logger.debug(`📁 Listing audio files from Grove manifest (prefix: ${prefix || 'all'})`);

            // Return files from the manifest that match the prefix
            const files = Object.values(FILE_MANIFEST);
            logger.debug(`📁 Total files in Grove manifest: ${files.length}`);

            if (prefix) {
                const filteredFiles = files.filter(file => file.path.startsWith(prefix));
                logger.debug(`📁 Files matching prefix \"${prefix}\": ${filteredFiles.length}`);
                return filteredFiles;
            }
            return files;
        } catch (error) {
            logger.error('❌ Failed to list audio files from Grove:', error);
            throw error;
        }
    }

    async uploadAudioFile(file: File, path: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.apiKey) {
            throw new Error('Grove API key not available. Please set GROVE_API_KEY environment variable.');
        }

        try {
            logger.debug(`📤 Uploading file to Grove: ${path}`);

            // Convert File to FormData for upload
            const formData = new FormData();
            formData.append('file', file);

            // Upload with immutable ACL (one-step upload)
            const uploadUrl = `${GROVE_GATEWAY_URL}/?chain_id=${BASE_CHAIN_ID}`;
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: file, // Direct binary upload
            });

            if (!response.ok) {
                throw new Error(`Grove upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json() as {
                storage_key: string;
                gateway_url: string;
                uri: string;
                status_url: string;
            };

            logger.info(`✅ File uploaded successfully. Storage key: ${result.storage_key}`);

            // Store in manifest
            const { artistName, songTitle } = parseArtistAndTitle(file.name);

            FILE_MANIFEST[file.name] = {
                name: file.name,
                path,
                artistName,
                songTitle,
                storageKey: result.storage_key,
                gatewayUrl: result.gateway_url,
                uri: result.uri,
            };

            return result.gateway_url;
        } catch (error) {
            logger.error('❌ Failed to upload file to Grove:', error);
            throw error;
        }
    }

    async uploadDirectory(files: File[]): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.apiKey) {
            throw new Error('Grove API key not available. Please set GROVE_API_KEY environment variable.');
        }

        try {
            logger.info(`📤 Uploading directory to Grove with ${files.length} files`);

            // Upload files individually and track them
            const uploadPromises = files.map(async (file) => {
                return await this.uploadAudioFile(file, `Global_Top_100/${file.name}`);
            });

            const uploadResults = await Promise.all(uploadPromises);

            logger.info(`✅ Directory uploaded successfully. ${uploadResults.length} files processed`);

            // Return the gateway base URL
            return GROVE_GATEWAY_URL;
        } catch (error) {
            logger.error('❌ Failed to upload directory to Grove:', error);
            throw error;
        }
    }

    async createSignedUrl(storageKeyOrPath: string, _expiresInSeconds = 300): Promise<string> {
        // Grove URLs are publicly readable, no signing needed
        // If it's already a full URL, return it
        if (storageKeyOrPath.startsWith('https://')) {
            return storageKeyOrPath;
        }

        // If it's a lens:// URI, resolve it
        if (storageKeyOrPath.startsWith('lens://')) {
            const storageKey = storageKeyOrPath.replace('lens://', '');
            return `${GROVE_GATEWAY_URL}/${storageKey}`;
        }

        // If it's a storage key (hash), construct the gateway URL
        if (storageKeyOrPath.match(/^[a-f0-9]{64}$/i)) {
            return `${GROVE_GATEWAY_URL}/${storageKeyOrPath}`;
        }

        // Try to find the file in the manifest by filename
        const fileName = storageKeyOrPath.split('/').pop();
        if (fileName && FILE_MANIFEST[fileName]) {
            const file = FILE_MANIFEST[fileName];
            return file.gatewayUrl || `${GROVE_GATEWAY_URL}/${file.storageKey}`;
        }

        // Default: treat as storage key
        return `${GROVE_GATEWAY_URL}/${storageKeyOrPath}`;
    }

    // Fallback method to get local file path if Grove fails
    getLocalFallbackUrl(path: string): string | null {
        const fileName = path.split('/').pop();
        if (!fileName) return null;

        // Always try local fallback for any .mp3 file
        if (fileName.endsWith('.mp3')) {
            return `/music/${fileName}`;
        }

        return null;
    }

    async getStorageInfo(): Promise<{ apiKey: string; status: string; gateway: string } | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.apiKey) {
            return null;
        }

        return {
            apiKey: this.apiKey.substring(0, 10) + '...',
            status: 'connected',
            gateway: GROVE_GATEWAY_URL,
        };
    }

    // Method to refresh manifest (for API compatibility)
    async refreshManifest(): Promise<void> {
        try {
            // In production, this would fetch from a database or API
            // For now, just log the current state
            logger.debug(`ℹ️ Grove manifest has ${Object.keys(FILE_MANIFEST).length} files`);
        } catch (error) {
            logger.warn('⚠️ Could not refresh Grove manifest:', error);
        }
    }

    // Helper method to populate manifest with local files (for testing/migration)
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
                // Placeholder values - will be populated when files are actually uploaded
                storageKey: undefined,
                gatewayUrl: undefined,
                uri: undefined,
            };
        });

        logger.info(`📝 Populated Grove manifest with ${localFiles.length} files (pending upload)`);
    }

    // Helper to resolve Lens URI to gateway URL
    resolve(uri: string): string {
        if (uri.startsWith('lens://')) {
            const storageKey = uri.replace('lens://', '');
            return `${GROVE_GATEWAY_URL}/${storageKey}`;
        }
        return uri;
    }
}

// Export a singleton instance
export const groveStorage = new GroveStorage();
