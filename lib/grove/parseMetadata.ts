export const parseArtistAndTitle = (
  filename: string,
): { artistName: string; songTitle: string } => {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return {
      artistName: parts[0]!.trim(),
      songTitle: parts.slice(1).join(' - ').trim(),
    };
  }

  const under = base.split('_');
  if (under.length >= 2) {
    return {
      artistName: under[0]!.trim(),
      songTitle: under.slice(1).join(' ').trim(),
    };
  }

  return { artistName: 'Unknown', songTitle: base.trim() || 'Unknown' };
};
