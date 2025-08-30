import { NextRequest, NextResponse } from 'next/server';

interface HighScore {
  id: string;
  playerName: string;
  score: number;
  timestamp: number;
  isGuest: boolean;
  guestId?: string;
  playerType: 'trial' | 'paid';
}

// In-memory storage for high scores (in production, this would be in a database)
let highScores: HighScore[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Return top scores sorted by score (highest first)
    const topScores = highScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return NextResponse.json({
      highScores: topScores,
      totalScores: highScores.length
    });
  } catch (error) {
    console.error('Error fetching high scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high scores' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerName, score, isGuest = false, guestId, playerType = 'paid' } = body;

    if (!playerName || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Player name and score are required' },
        { status: 400 }
      );
    }

    const newScore: HighScore = {
      id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerName,
      score,
      timestamp: Date.now(),
      isGuest,
      guestId,
      playerType: isGuest ? 'trial' : 'paid'
    };

    // Add to high scores
    highScores.push(newScore);
    
    // Keep only top 100 scores to prevent memory issues
    if (highScores.length > 100) {
      highScores = highScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
    }

    // Check if this is a new high score
    const sortedScores = [...highScores].sort((a, b) => b.score - a.score);
    const isNewHighScore = sortedScores[0]?.id === newScore.id;
    const rank = sortedScores.findIndex(s => s.id === newScore.id) + 1;

    return NextResponse.json({
      success: true,
      score: newScore,
      isNewHighScore,
      rank,
      totalScores: highScores.length
    });
  } catch (error) {
    console.error('Error adding high score:', error);
    return NextResponse.json(
      { error: 'Failed to add high score' },
      { status: 500 }
    );
  }
}
