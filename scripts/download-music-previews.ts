#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { SONG_CATALOG, songCatalogFilename } from '../lib/grove/songCatalog';
import { ITunesAPI } from '../lib/apis/itunes';

const MUSIC_DIR = path.join(process.cwd(), 'public/music');
const DOWNLOAD_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadPreview = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
  }

  const existing = new Set(
    fs.readdirSync(MUSIC_DIR).filter((name) => name.endsWith('.mp3')),
  );

  const pending = SONG_CATALOG.filter((entry) => {
    const filename = songCatalogFilename(entry);
    return force || !existing.has(filename);
  });

  console.log(`🎵 iTunes preview download: ${pending.length} tracks pending (${SONG_CATALOG.length} total)`);

  if (dryRun) {
    pending.forEach((entry) => console.log(`  - ${songCatalogFilename(entry)}`));
    return;
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of pending) {
    const filename = songCatalogFilename(entry);

    if (existing.has(filename) && !force) {
      skipped += 1;
      continue;
    }

    try {
      const previewUrl = await ITunesAPI.searchPreviewByArtistAndTitle(
        entry.artistName,
        entry.songTitle,
      );

      if (!previewUrl) {
        console.warn(`⚠️ No preview found: ${entry.artistName} - ${entry.songTitle}`);
        failed += 1;
        continue;
      }

      const buffer = await downloadPreview(previewUrl);
      fs.writeFileSync(path.join(MUSIC_DIR, filename), buffer);
      downloaded += 1;
      console.log(`✅ ${filename}`);
      await sleep(DOWNLOAD_DELAY_MS);
    } catch (error) {
      failed += 1;
      console.error(
        `❌ ${filename}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
