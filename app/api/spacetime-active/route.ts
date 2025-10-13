import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    await spacetimeClient.initialize();
    
    const players = await spacetimeClient.getActivePlayers(limit);
    
    return NextResponse.json({
      players,
      count: players.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching active players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active players' },
      { status: 500 }
    );
  }
}

