import { NextRequest, NextResponse } from 'next/server';

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
    // Generate demo players for live leaderboard
    const demoPlayers = generateDemoPlayers();
    return NextResponse.json({ 
      players: demoPlayers,
      count: demoPlayers.length,
      source: 'demo'
    });

  } catch (error) {
    console.error('❌ Error generating demo players:', error);
    
    // Fallback to minimal demo data on error
    const fallbackPlayers = [{
      address: '0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9',
      username: 'VITALIK.BASE.ETH',
      avatarUrl: null,
      totalScore: 1000,
      gamesPlayed: 1,
      isWalletUser: true,
      lastActive: new Date().toISOString()
    }];
    
    return NextResponse.json({ 
      players: fallbackPlayers,
      count: fallbackPlayers.length,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

