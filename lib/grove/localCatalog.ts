import type { GroveFileEntry } from '@/lib/grove-files';
import { SONG_CATALOG, songCatalogFilename } from '@/lib/grove/songCatalog';

export const getLocalAudioCatalog = (): GroveFileEntry[] =>
  SONG_CATALOG.map((entry) => ({
    name: songCatalogFilename(entry),
    path: `Global_Top_100/${songCatalogFilename(entry)}`,
    artistName: entry.artistName,
    songTitle: entry.songTitle,
  }));
