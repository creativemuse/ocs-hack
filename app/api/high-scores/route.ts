import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyLeaderboardEntries } from '@/lib/game/weeklyLeaderboardServer';
import { computeRankForScore } from '@/lib/game/weeklyLeaderboard';

interface HighScore {
  id: string;
  playerName: string;
  walletAddress?: string;
  score: number;
  timestamp: number;
  isGuest: boolean;
  guestId?: string;
  playerType: 'trial' | 'paid';
  username?: string;
}

const toHighScoreRow = (entry: {
  walletAddress: string;
  username?: string;
  bestScore: number;
}): HighScore => ({
  id: `weekly_${entry.walletAddress}`,
  playerName: entry.username ?? entry.walletAddress,
  walletAddress: entry.walletAddress,
  score: entry.bestScore,
  timestamp: Date.now(),
  isGuest: false,
  playerType: 'paid',
  username: entry.username,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const { entries } = await getWeeklyLeaderboardEntries(Math.min(limit, 10));
    const highScores = entries.map(toHighScoreRow);

    return NextResponse.json({
      highScores,
      totalScores: highScores.length,
    });
  } catch (error) {
    console.error('Error fetching high scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high scores' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      playerName,
      score,
      isGuest = false,
      guestId,
      walletAddress,
    } = body;

    if (isGuest) {
      return NextResponse.json(
        { error: 'Trial scores are not stored on the paid weekly leaderboard' },
        { status: 400 },
      );
    }

    if (!walletAddress || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'walletAddress and score are required for rank lookup' },
        { status: 400 },
      );
    }

    const { entries } = await getWeeklyLeaderboardEntries(100);
    const rank = computeRankForScore(entries, walletAddress, score);
    const matched = entries.find(
      (e) => e.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );

    const row: HighScore = {
      id: `weekly_${walletAddress.toLowerCase()}`,
      playerName: playerName || matched?.username || walletAddress,
      walletAddress: walletAddress.toLowerCase(),
      score: matched ? Math.max(matched.bestScore, score) : score,
      timestamp: Date.now(),
      isGuest: false,
      playerType: 'paid',
      username: playerName || matched?.username,
    };

    const isNewHighScore = rank === 1;

    return NextResponse.json({
      success: true,
      score: row,
      isNewHighScore,
      rank,
      totalScores: entries.length,
      note: 'Paid scores persist via /api/save-paid-score; this endpoint returns weekly rank only.',
    });
  } catch (error) {
    console.error('Error resolving high score rank:', error);
    return NextResponse.json(
      { error: 'Failed to resolve score rank' },
      { status: 500 },
    );
  }
}
