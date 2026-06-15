#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { GROVE_FILES } from '../lib/grove-files';
import { uploadFileToGrove } from '../lib/grove/client';
import { parseArtistAndTitle } from '../lib/grove/parseMetadata';
import { writeGroveManifestFile } from '../lib/grove/writeManifest';
import type { GroveFileEntry } from '../lib/grove-files';

const MUSIC_DIR = path.join(process.cwd(), 'public/music');
const UPLOAD_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildManifestFromDisk = (): Record<string, GroveFileEntry> => {
  const manifest: Record<string, GroveFileEntry> = { ...GROVE_FILES };

  if (!fs.existsSync(MUSIC_DIR)) {
    throw new Error('Music directory not found at public/music');
  }

  const fileNames = fs
    .readdirSync(MUSIC_DIR)
    .filter((name) => name.endsWith('.mp3'))
    .sort();

  for (const name of fileNames) {
    const { artistName, songTitle } = parseArtistAndTitle(name);
    const existing = manifest[name];

    if (!existing) {
      manifest[name] = {
        name,
        path: `Global_Top_100/${name}`,
        artistName,
        songTitle,
      };
      continue;
    }

    manifest[name] = {
      ...existing,
      artistName,
      songTitle,
    };
  }

  return manifest;
};

const main = async () => {
  const force = process.argv.includes('--force');
  const dryRun = process.argv.includes('--dry-run');
  const manifest = buildManifestFromDisk();
  const pending = Object.values(manifest).filter(
    (file) => file.path.startsWith('Global_Top_100/') && (!file.gatewayUrl || force),
  );

  console.log(`🌳 Grove upload: ${pending.length} trivia tracks pending`);

  if (dryRun) {
    pending.forEach((file) => console.log(`  - ${file.name}`));
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of pending) {
    const filePath = path.join(MUSIC_DIR, entry.name);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Missing file on disk: ${entry.name}`);
      failed += 1;
      continue;
    }

    if (entry.gatewayUrl && !force) {
      skipped += 1;
      continue;
    }

    try {
      console.log(`📤 Uploading ${entry.name}...`);
      const buffer = fs.readFileSync(filePath);
      const result = await uploadFileToGrove(buffer, entry.name);

      manifest[entry.name] = {
        ...entry,
        storageKey: result.storageKey,
        gatewayUrl: result.gatewayUrl,
        uri: result.uri,
      };

      writeGroveManifestFile(manifest);
      uploaded += 1;
      console.log(`✅ ${entry.name} → ${result.gatewayUrl}`);
      await sleep(UPLOAD_DELAY_MS);
    } catch (error) {
      failed += 1;
      console.error(
        `❌ ${entry.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  writeGroveManifestFile(manifest);
  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
