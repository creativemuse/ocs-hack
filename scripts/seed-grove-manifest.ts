#!/usr/bin/env tsx

import { GROVE_FILES } from '../lib/grove-files';
import { getLocalAudioCatalog } from '../lib/grove/localCatalog';
import { writeGroveManifestFile } from '../lib/grove/writeManifest';
import type { GroveFileEntry } from '../lib/grove-files';

const LOBBY_ENTRY: GroveFileEntry = {
  name: 'ComputerBits_mastered.mp3',
  path: 'lobby/ComputerBits_mastered.mp3',
  artistName: 'G2',
  songTitle: 'Computer Bits',
  storageKey: '39143946d8fdbfdedd12b7b1fb508cfb9d39701e81a24dde5841cf87a6bab967',
  gatewayUrl:
    'https://api.grove.storage/39143946d8fdbfdedd12b7b1fb508cfb9d39701e81a24dde5841cf87a6bab967',
  uri: 'lens://39143946d8fdbfdedd12b7b1fb508cfb9d39701e81a24dde5841cf87a6bab967',
};

const main = () => {
  const manifest: Record<string, GroveFileEntry> = {
    ...GROVE_FILES,
    [LOBBY_ENTRY.name]: LOBBY_ENTRY,
  };

  for (const entry of getLocalAudioCatalog()) {
    const existing = manifest[entry.name];
    manifest[entry.name] = {
      ...entry,
      storageKey: existing?.storageKey,
      gatewayUrl: existing?.gatewayUrl,
      uri: existing?.uri,
    };
  }

  writeGroveManifestFile(manifest);
  console.log(`✅ Seeded lib/grove-files.ts with ${Object.keys(manifest).length} entries`);
};

main();
