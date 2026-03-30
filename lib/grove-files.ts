/**
 * Grove Storage File Manifest
 * 
 * Tracks Grove-uploaded audio files with storage keys and gateway URLs.
 * This manifest is populated as files are uploaded to Grove.
 */

export const GROVE_FILES: Record<string, {
    name: string;
    path: string;
    artistName: string;
    songTitle: string;
    storageKey?: string;
    gatewayUrl?: string;
    uri?: string;
}> = {
    // Files will be added here as they are uploaded to Grove
    // Example format:
    // "Artist - Song.mp3": {
    //   name: "Artist - Song.mp3",
    //   path: "Global_Top_100/Artist - Song.mp3",
    //   artistName: "Artist",
    //   songTitle: "Song",
    //   storageKey: "323c0e1ccebcfa70dc130772...",
    //   gatewayUrl: "https://api.grove.storage/323c0e1c...",
    //   uri: "lens://323c0e1c..."
    // }
};
