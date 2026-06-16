import { parseUrl } from '@orbclub/modules/media';

const DEFAULT_LENS_GATEWAY = 'https://gw.lens.xyz';

export const resolveLensMediaUrl = (
  uri: string | null | undefined,
): string | null => {
  if (!uri?.trim()) {
    return null;
  }

  const trimmed = uri.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return (
    parseUrl(trimmed, {
      lensGateway: DEFAULT_LENS_GATEWAY,
      ipfsGateway: 'https://ipfs.io/ipfs/',
    }) ?? null
  );
};
