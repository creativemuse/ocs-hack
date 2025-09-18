import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, score, questions, answers } = await req.json();
    
    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();
    
    // Create player if they don't exist
    await spacetimeClient.createPlayer(walletAddress);
    
    // Update player stats
    // Note: In a real implementation, you'd query current stats first
    // For now, we'll assume this is the first game
    await spacetimeClient.updatePlayerStats(walletAddress, score, 1, score, 0);
    
    // Update trial status (decrement trial games)
    await spacetimeClient.updateTrialStatus(walletAddress, 0, true);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving wallet game:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 }
    );
  }
}
