import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { BeatMeOgLayout } from '@/lib/og/beatMeOgLayout';
import { getSiteUrl } from '@/lib/config/site';

export const runtime = 'edge';

const OG_THUMBNAIL_PATH = '/assets/BEAT_ME_thumbnail.png';

const parseScoreParam = (score: string): number => {
  const parsed = Number(score);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const headlineForType = (type: string, score: string, rank: string): string => {
  const scoreValue = parseScoreParam(score);
  if (rank === '1') return 'New #1 on the weekly leaderboard!';
  switch (type) {
    case 'high-score':
      return 'Set a new high score!';
    case 'round-win':
      return 'Round victory!';
    case 'perfect-round':
      return 'Perfect round!';
    default:
      return scoreValue > 0
        ? `Scored ${scoreValue.toLocaleString()} points!`
        : 'Play BEAT ME — music trivia on Base';
  }
};

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const scoreParam = searchParams.get('score') ?? '0';
  const rank = searchParams.get('rank') ?? '';
  const type = searchParams.get('type') ?? 'game-complete';
  const scoreValue = parseScoreParam(scoreParam);
  const headline = headlineForType(type, scoreParam, rank);
  const backgroundImageUrl = `${getSiteUrl()}${OG_THUMBNAIL_PATH}`;

  return new ImageResponse(
    <BeatMeOgLayout
      mode="scoreOverlay"
      backgroundImageUrl={backgroundImageUrl}
      headline={headline}
      score={scoreValue > 0 ? String(scoreValue) : undefined}
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
