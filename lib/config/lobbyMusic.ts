import { GROVE_FILES } from '@/lib/grove-files';

/** Lobby track metadata (Synaptic Surge — G2). */
export const LOBBY_MUSIC = {
  title: 'Computer Bits',
  artist: 'G2',
  album: 'Synaptic Surge',
  albumUrl: 'https://album.link/synaptic-surge',
  /**
   * Lens Grove in production; override via NEXT_PUBLIC_LOBBY_MUSIC_URL.
   * Local fallback: /public/lobby/ComputerBits_mastered.mp3
   */
  src:
    process.env.NEXT_PUBLIC_LOBBY_MUSIC_URL ??
    GROVE_FILES['ComputerBits_mastered.mp3']?.gatewayUrl ??
    '/lobby/ComputerBits_mastered.mp3',
} as const;
