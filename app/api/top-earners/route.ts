import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    await spacetimeClient.initialize();
    const topEarners = await spacetimeClient.getTopEarners(limit);
    
    return NextResponse.json({
      topEarners,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error fetching top earners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top earners' },
      { status: 500 }
    );
  }
}

