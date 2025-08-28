import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabase } from '@/lib/apis/supabase';

// Generate demo players for fallback
const generateDemoPlayers = () => {
  const demoAddresses = [
    '0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9',
    '0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF',
    '0x1234567890abcdef1234567890abcdef12345678',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x9876543210fedcba9876543210fedcba98765432',
    '0xfedcba0987654321fedcba0987654321fedcba09',
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666',
    '0x7777777777777777777777777777777777777777',
    '0x8888888888888888888888888888888888888888',
    '0x9999999999999999999999999999999999999999',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  ];

  const demoUsernames = [
    'VITALIK.BASE.ETH',
    'PAULCRAMER.BASE.ETH',
    'ALICE.BASE.ETH',
    'BOB.BASE.ETH',
    'CHARLIE.BASE.ETH',
    'DAVE.BASE.ETH',
    'EVE.BASE.ETH',
    'FRANK.BASE.ETH',
    'GRACE.BASE.ETH',
    'HENRY.BASE.ETH',
    'IRIS.BASE.ETH',
    'JACK.BASE.ETH',
    'KATE.BASE.ETH',
    'LUCY.BASE.ETH',
    'MIKE.BASE.ETH',
    'NINA.BASE.ETH'
  ];

  return Array.from({ length: Math.min(16, demoAddresses.length) }, (_, i) => ({
    address: demoAddresses[i]!,
    username: demoUsernames[i]!,
    avatarUrl: null,
    totalScore: Math.floor(Math.random() * 1000) + 100,
    gamesPlayed: Math.floor(Math.random() * 50) + 1,
    isWalletUser: true,
    lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
  }));
};

export async function GET(req: NextRequest) {
  try {
    // Check if Supabase is configured
    const client = SupabaseDatabase.getClient();
    if (!client) {
      console.log('Supabase not configured, returning demo players');
      const demoPlayers = generateDemoPlayers();
      return NextResponse.json({ 
        players: demoPlayers,
        count: demoPlayers.length,
        source: 'demo'
      });
    }

    // Try to get recent players from database
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Check if players table exists by trying a simple query
      const { data: recentPlayers, error } = await client
        .from('players')
        .select(`
          wallet_address,
          username,
          avatar_url,
          total_score,
          games_played,
          updated_at
        `)
        .gte('updated_at', twentyFourHoursAgo)
        .order('total_score', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching players from database:', error);
        // Fall back to demo players
        const demoPlayers = generateDemoPlayers();
        return NextResponse.json({ 
          players: demoPlayers,
          count: demoPlayers.length,
          source: 'demo-fallback'
        });
      }

      // Try to get anonymous sessions
      let recentSessions: Array<{
        session_id: string;
        total_score: number;
        games_played: number;
        updated_at: string;
      }> = [];
      try {
        const { data: sessions, error: sessionError } = await client
          .from('anonymous_sessions')
          .select(`
            session_id,
            total_score,
            games_played,
            updated_at
          `)
          .gte('updated_at', twentyFourHoursAgo)
          .order('total_score', { ascending: false })
          .limit(10);

        if (!sessionError && sessions) {
          recentSessions = sessions;
        }
      } catch (sessionError) {
        console.log('Anonymous sessions table not available, skipping');
      }

      // Combine and format the data
      const activePlayers = [
        ...(recentPlayers || []).map(player => ({
          address: player.wallet_address,
          username: player.username || `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`,
          avatarUrl: player.avatar_url,
          totalScore: player.total_score,
          gamesPlayed: player.games_played,
          isWalletUser: true,
          lastActive: player.updated_at
        })),
        ...recentSessions.map(session => ({
          address: `anon_${session.session_id.slice(0, 8)}`,
          username: `Anonymous Player ${session.session_id.slice(0, 4)}`,
          avatarUrl: null,
          totalScore: session.total_score,
          gamesPlayed: session.games_played,
          isWalletUser: false,
          lastActive: session.updated_at
        }))
      ].sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 16);

      // If no real players found, add some demo players
      if (activePlayers.length === 0) {
        const demoPlayers = generateDemoPlayers();
        return NextResponse.json({ 
          players: demoPlayers,
          count: demoPlayers.length,
          source: 'demo-no-data'
        });
      }

      return NextResponse.json({ 
        players: activePlayers,
        count: activePlayers.length,
        source: 'database'
      });

    } catch (dbError) {
      console.error('Database error, falling back to demo players:', dbError);
      const demoPlayers = generateDemoPlayers();
      return NextResponse.json({ 
        players: demoPlayers,
        count: demoPlayers.length,
        source: 'demo-error'
      });
    }

  } catch (error) {
    console.error('Unexpected error in active players API:', error);
    // Final fallback
    const demoPlayers = generateDemoPlayers();
    return NextResponse.json({ 
      players: demoPlayers,
      count: demoPlayers.length,
      source: 'demo-unexpected'
    });
  }
}
