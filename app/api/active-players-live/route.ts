import { NextRequest, NextResponse } from 'next/server';
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

// Contract addresses from environment
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xc166a6FB38636e8430d6A2Efb7A601c226659425';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

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
    // Check if CDP API is configured (support both old and new env var names)
    const hasConfig = (process.env.CDP_API_KEY && process.env.CDP_API_SECRET) || 
                      (process.env.KEY_NAME && process.env.KEY_SECRET);
    
    if (!hasConfig) {
      console.log('⚠️ CDP API not configured - using demo players');
      console.log('💡 Add CDP_API_KEY and CDP_API_SECRET to .env.local to use live blockchain data');
      const demoPlayers = generateDemoPlayers();
      return NextResponse.json({ 
        players: demoPlayers,
        count: demoPlayers.length,
        source: 'demo-no-config'
      });
    }

    console.log('🔍 Fetching active players from CDP SQL API...');
    
    // Create CDP SQL client
    const sqlClient = createCDPSQLClient();
    
    // Get active players from blockchain data (last 24 hours)
    const rawPlayers = await sqlClient.getActivePlayers(
      TRIVIA_CONTRACT_ADDRESS,
      USDC_ADDRESS,
      24 // 24 hour window
    );

    console.log(`✅ Found ${rawPlayers.length} active players from blockchain`);

    // If no real players found, use demo data with a note
    if (rawPlayers.length === 0) {
      console.log('ℹ️ No active players in last 24 hours - using demo players');
      const demoPlayers = generateDemoPlayers();
      return NextResponse.json({ 
        players: demoPlayers,
        count: demoPlayers.length,
        source: 'demo-no-activity'
      });
    }

    // Transform CDP data to our ActivePlayer format
    const players = rawPlayers.map((row: any) => ({
      address: row.address,
      username: row.address, // Will be resolved by OnchainKit to basename/ENS
      avatarUrl: null, // OnchainKit will fetch the real avatar
      totalScore: Math.round(row.total_score || 0),
      gamesPlayed: parseInt(row.games_played) || 0,
      isWalletUser: true,
      lastActive: row.last_active
    }));

    return NextResponse.json({ 
      players,
      count: players.length,
      source: 'cdp-sql-api-live',
      timestamp: new Date().toISOString(),
      contractAddress: TRIVIA_CONTRACT_ADDRESS
    });

  } catch (error) {
    console.error('❌ Error fetching live players from CDP:', error);
    
    // Fallback to demo players on error
    const demoPlayers = generateDemoPlayers();
    return NextResponse.json({ 
      players: demoPlayers,
      count: demoPlayers.length,
      source: 'demo-error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

