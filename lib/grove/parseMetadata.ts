/** Remove featured-artist suffixes from a song title for trivia answers. */
export const stripFeaturingFromTitle = (title: string): string => {
  const stripped = title
    .replace(/\s*\((?:audio|official\s*(?:video|audio)|lyric\s*video|music\s*video)\)\s*/gi, ' ')
    .replace(
      /\s+(?:ft\.?|feat\.?|featuring)\s+.+$/i,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();

  return stripped || title.trim();
};

export const parseArtistAndTitle = (
  filename: string,
): { artistName: string; songTitle: string } => {
  const base = filename.replace(/\.[^/.]+$/, '');
  let artistName = 'Unknown';
  let songTitle = base.trim() || 'Unknown';

  const parts = base.split(' - ');
  if (parts.length >= 2) {
    artistName = parts[0]!.trim();
    songTitle = parts.slice(1).join(' - ').trim();
  } else {
    const under = base.split('_');
    if (under.length >= 2) {
      artistName = under[0]!.trim();
      songTitle = under.slice(1).join(' ').trim();
    } else {
      const hyphen = base.match(/^(.+?)\s*-\s*(.+)$/);
      if (hyphen) {
        artistName = hyphen[1]!.trim();
        songTitle = hyphen[2]!.trim();
      }
    }
  }

  return {
    artistName,
    songTitle: stripFeaturingFromTitle(songTitle),
  };
};
