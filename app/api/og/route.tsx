import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { BeatMeOgLayout } from '@/lib/og/beatMeOgLayout';
import { getSiteUrl } from '@/lib/config/site';

export const runtime = 'edge';

const OG_THUMBNAIL_PATH = '/assets/BEAT_ME_thumbnail.png';

const headlineForType = (type: string, score: string, rank: string): string => {
  if (rank === '1') return 'New #1 on the weekly leaderboard!';
  switch (type) {
    case 'high-score':
      return 'Set a new high score!';
    case 'round-win':
      return 'Round victory!';
    case 'perfect-round':
      return 'Perfect round!';
    default:
      return `Scored ${Number(score).toLocaleString()} points!`;
  }
};

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const score = searchParams.get('score') ?? '0';
  const rank = searchParams.get('rank') ?? '';
  const type = searchParams.get('type') ?? 'game-complete';
  const headline = headlineForType(type, score, rank);
  const backgroundImageUrl = `${getSiteUrl()}${OG_THUMBNAIL_PATH}`;

  return new ImageResponse(
    <BeatMeOgLayout
      mode="scoreOverlay"
      backgroundImageUrl={backgroundImageUrl}
      headline={headline}
      score={score}
      rank={rank || undefined}
      subline="Play BEAT ME — music trivia on Base"
    />,
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    },
  );
};
