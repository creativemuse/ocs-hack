import { NextRequest, NextResponse } from 'next/server';
import { DbConnectionBuilder } from '@clockworklabs/spacetimedb-sdk';

const SPACETIME_URL = process.env.SPACETIME_URL || 'ws://localhost:3000';
const SPACETIME_DB = process.env.SPACETIME_DB || 'beat-me';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, guestData } = body;

    if (!guestData) {
      return NextResponse.json({ error: 'Guest data is required' }, { status: 400 });
    }

    // Initialize SpacetimeDB connection
    const connection = await DbConnectionBuilder.connect(SPACETIME_URL, SPACETIME_DB);
    
    switch (action) {
      case 'create_guest':
        await connection.call('create_guest_player', [
          guestData.guest_id,
          guestData.name
        ]);
        break;

      case 'update_guest':
        await connection.call('update_guest_player', [
          guestData.guest_id,
          guestData.games_played,
          guestData.total_score,
          guestData.best_score,
          JSON.stringify(guestData.achievements)
        ]);
        break;

      case 'record_game':
        await connection.call('record_guest_game', [
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
    const connection = await DbConnectionBuilder.connect(SPACETIME_URL, SPACETIME_DB);
    
    // Query guest player data
    const guestPlayers = await connection.query('SELECT * FROM guest_players WHERE guest_id = ?', [guestId]);
    const guestGames = await connection.query('SELECT * FROM guest_game_sessions WHERE guest_id = ? ORDER BY started_at DESC LIMIT 10', [guestId]);

    return NextResponse.json({
      guest: guestPlayers[0] || null,
      recentGames: guestGames || []
    });
  } catch (error) {
    console.error('Error fetching guest data from SpacetimeDB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
