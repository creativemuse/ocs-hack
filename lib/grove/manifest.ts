import { GROVE_FILES, type GroveFileEntry } from '@/lib/grove-files';

export const getGroveManifestEntries = (): GroveFileEntry[] =>
  Object.values(GROVE_FILES);

export const hasUploadedGroveFiles = (): boolean =>
  getGroveManifestEntries().some((file) => Boolean(file.gatewayUrl));

export const hasUploadedGroveTriviaFiles = (): boolean =>
  listGroveAudioByPrefix('Global_Top_100').some((file) => Boolean(file.gatewayUrl));

export const listGroveAudioByPrefix = (prefix: string): GroveFileEntry[] =>
  getGroveManifestEntries().filter((file) => file.path.startsWith(prefix));

export const findGroveFileByName = (name: string): GroveFileEntry | undefined =>
  GROVE_FILES[name];

export const resolveGroveAudioUrl = (file: GroveFileEntry): string => {
  if (file.gatewayUrl) {
    return file.gatewayUrl;
  }

  if (file.path.startsWith('lobby/')) {
    return `/lobby/${file.name}`;
  }

  return `/music/${file.name}`;
};

export const resolveGroveAudioUrlByName = (name: string): string | null => {
  const file = findGroveFileByName(name);
  if (!file) {
    return null;
  }

  return resolveGroveAudioUrl(file);
};
