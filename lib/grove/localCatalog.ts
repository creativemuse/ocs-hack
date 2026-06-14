import type { GroveFileEntry } from '@/lib/grove-files';
import { parseArtistAndTitle } from '@/lib/grove/parseMetadata';

const LOCAL_AUDIO_FILES = [
  'Chappell Roan - Pink Pony Club.mp3',
  'The Spins.mp3',
  'Pierce The Veil - So Far So Fake.mp3',
  'Travis Scott - HIGHEST IN THE ROOM.mp3',
  'Luke Combs - Fast Car.mp3',
  'Bad Bunny - Tití Me Preguntó.mp3',
  'Ed Sheeran - Perfect.mp3',
  'Radiohead - Creep.mp3',
  'Drake - One Dance.mp3',
  'Chris Stapleton - Tennessee Whiskey.mp3',
  'will.i.am - Scream & Shout.mp3',
  'The Black Eyed Peas - Rock That Body.mp3',
  'Travis Scott - goosebumps  ft. Kendrick Lamar.mp3',
  'The Weeknd - Blinding Lights.mp3',
  'Billie Eilish - Ocean Eyes.mp3',
  'Fuerza Regida - TU SANCHO.mp3',
  'Ed Sheeran - Shape of You.mp3',
  'Bad Bunny - DtMF.mp3',
  'Future - WAIT FOR U.mp3',
  'Taylor Swift - Cruel Summer.mp3',
  'Sabrina Carpenter - Espresso.mp3',
  'NOKIA.mp3',
  'Shaboozey - A Bar Song (Tipsy).mp3',
  'Teddy Swims - Lose Control.mp3',
  'SZA - 30 For 30 feat. Kendrick Lamar.mp3',
  'Billie Eilish - BIRDS OF A FEATHER.mp3',
  'Kendrick Lamar - luther.mp3',
  'Gunna - wgft.mp3',
  'Not Like Us.mp3',
  'Post Malone - I Had Some Help.mp3',
  'ROSÉ & Bruno Mars - APT.mp3',
  'Sabrina Carpenter - Manchild.mp3',
  'Kehlani - Folded.mp3',
  'Lady Gaga, Bruno Mars - Die With A Smile.mp3',
  'BLACKPINK - JUMP.mp3',
  'Chris Brown - It Depends (Audio) ft. Bryson Tiller.mp3',
  'Morgan Wallen, Tate McRae - What I Want.mp3',
  'Justin Beiber-YUKON.mp3',
  'Justin Beiber-DAISIES.mp3',
  'Alex Warren - Ordinary.mp3',
  'Huntrix - Golden.mp3',
] as const;

export const getLocalAudioCatalog = (): GroveFileEntry[] =>
  LOCAL_AUDIO_FILES.map((name) => {
    const { artistName, songTitle } = parseArtistAndTitle(name);
    return {
      name,
      path: `Global_Top_100/${name}`,
      artistName,
      songTitle,
    };
  });
