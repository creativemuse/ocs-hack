#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { GROVE_FILES } from '../lib/grove-files';
import { uploadFileToGrove } from '../lib/grove/client';
import { writeGroveManifestFile } from '../lib/grove/writeManifest';
import type { GroveFileEntry } from '../lib/grove-files';

const LOBBY_FILE = 'ComputerBits_mastered.mp3';
const LOBBY_PATH = path.join(process.cwd(), 'public/lobby', LOBBY_FILE);

const main = async () => {
  if (!fs.existsSync(LOBBY_PATH)) {
    throw new Error(`Lobby track not found at public/lobby/${LOBBY_FILE}`);
  }

  console.log(`📤 Uploading lobby track ${LOBBY_FILE} to Grove...`);
  const buffer = fs.readFileSync(LOBBY_PATH);
  const result = await uploadFileToGrove(buffer, LOBBY_FILE);

  const manifest: Record<string, GroveFileEntry> = {
    ...GROVE_FILES,
    [LOBBY_FILE]: {
      name: LOBBY_FILE,
      path: `lobby/${LOBBY_FILE}`,
      artistName: 'G2',
      songTitle: 'Computer Bits',
      storageKey: result.storageKey,
      gatewayUrl: result.gatewayUrl,
      uri: result.uri,
    },
  };

  writeGroveManifestFile(manifest);

  console.log(`✅ Lobby track uploaded`);
  console.log(`   gatewayUrl: ${result.gatewayUrl}`);
  console.log(`   Set NEXT_PUBLIC_LOBBY_MUSIC_URL=${result.gatewayUrl}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
