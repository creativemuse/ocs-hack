import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, guestData } = body;

    if (!guestData) {
      return NextResponse.json({ error: 'Guest data is required' }, { status: 400 });
    }

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();
    
    switch (action) {
      case 'create_guest':
        await spacetimeClient.call('create_guest_player', [
          guestData.guest_id,
          guestData.name
        ]);
        break;

      case 'update_guest':
        await spacetimeClient.call('update_guest_player', [
          guestData.guest_id,
          guestData.games_played,
          guestData.total_score,
          guestData.best_score,
          JSON.stringify(guestData.achievements)
        ]);
        break;

      case 'record_game':
        await spacetimeClient.call('record_guest_game', [
          guestData.session_id,
          guestData.guest_id,
          guestData.score,
          guestData.questions_answered || 0,
          guestData.correct_answers || 0,
          JSON.stringify(guestData.game_data || {})
        ]);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error syncing guest data to SpacetimeDB:', error);
    return NextResponse.json(
      { error: 'Failed to sync guest data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guest_id');

    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 });
    }

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();
    
    // Use SpacetimeDB SDK to get guest player data
    const guest = spacetimeClient.getGuestPlayer(guestId);
    const recentGames = spacetimeClient.getGuestGameSessions(guestId, 10);

    return NextResponse.json({
      guest: guest || null,
      recentGames: recentGames || []
    });
  } catch (error) {
    console.error('Error fetching guest data from SpacetimeDB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
