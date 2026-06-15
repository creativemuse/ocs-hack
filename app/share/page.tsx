import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteUrl } from '@/lib/config/site';

type SharePageProps = {
  searchParams: Promise<{
    score?: string;
    rank?: string;
    type?: string;
  }>;
};

const buildOgImageUrl = (score: string, rank: string, type: string): string => {
  const siteUrl = getSiteUrl();
  const params = new URLSearchParams({ score, type });
  if (rank) params.set('rank', rank);
  return `${siteUrl}/api/og?${params.toString()}`;
};

export const generateMetadata = async ({
  searchParams,
}: SharePageProps): Promise<Metadata> => {
  const params = await searchParams;
  const score = params.score ?? '0';
  const rank = params.rank ?? '';
  const type = params.type ?? 'game-complete';
  const scoreNum = Number(score);
  const siteUrl = getSiteUrl();
  const ogImageUrl = buildOgImageUrl(score, rank, type);

  const title =
    rank === '1'
      ? `🏆 #1 on BEAT ME with ${scoreNum.toLocaleString()} pts!`
      : scoreNum > 0
        ? `Scored ${scoreNum.toLocaleString()} on BEAT ME!`
        : 'BEAT ME — Music Trivia';

  const description =
    rank === '1'
      ? 'Just hit #1 on the weekly BEAT ME leaderboard. Can you beat this score?'
      : 'Name the tune, win a reward. Play BEAT ME on Base.';

  const sharePath = `/share?score=${encodeURIComponent(score)}&type=${encodeURIComponent(type)}${rank ? `&rank=${encodeURIComponent(rank)}` : ''}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: sharePath,
      siteName: 'BEAT ME',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: title,
        },
      ],
    },
  };
};

export default async function SharePage({ searchParams }: SharePageProps) {
  const params = await searchParams;
  const score = Number(params.score ?? '0');
  const rank = params.rank ? Number(params.rank) : null;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-purple-400 text-sm uppercase tracking-widest mb-2">BEAT ME</p>
      <h1 className="text-3xl font-bold mb-4">
        {rank === 1 ? '🏆 Weekly #1' : 'Music trivia on Base'}
      </h1>
      {score > 0 && (
        <p className="text-5xl font-black text-yellow-400 mb-2">{score.toLocaleString()} pts</p>
      )}
      {rank != null && rank > 0 && (
        <p className="text-gray-400 mb-8">Rank #{rank} this week</p>
      )}
      <Link
        href="/"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold"
      >
        Play BEAT ME
      </Link>
    </main>
  );
}
