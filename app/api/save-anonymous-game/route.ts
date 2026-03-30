import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, score, questions, answers } = await req.json();
    
    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();
    
    // Create anonymous session if it doesn't exist
    await spacetimeClient.createAnonymousSession(sessionId);
    
    // Update anonymous session stats
    // Note: In a real implementation, you'd query the current stats first
    // For now, we'll assume this is the first game (games_played = 1)
    await spacetimeClient.updateAnonymousSession(sessionId, 1, score, score);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving anonymous game:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 }
    );
  }
}
