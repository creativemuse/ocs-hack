import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    await spacetimeClient.initialize();
    
    // Get player profile
    const profile = await spacetimeClient.getPlayerProfile(walletAddress);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // Get prize history
    const prizeHistory = await spacetimeClient.getPrizeHistory(walletAddress, 10);
    
    // Get pending claims
    const pendingClaims = await spacetimeClient.getPendingClaims(walletAddress);
    
    return NextResponse.json({
      profile,
      prizeHistory,
      pendingClaims,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}

