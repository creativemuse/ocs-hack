import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // Ultra-minimal static data - no dependencies, no dynamic generation
  const players = [
    { address: '0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9', username: 'VITALIK.BASE.ETH', totalScore: 1000, gamesPlayed: 5, isWalletUser: true, lastActive: '2024-01-01T00:00:00.000Z' },
    { address: '0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF', username: 'PAULCRAMER.BASE.ETH', totalScore: 850, gamesPlayed: 3, isWalletUser: true, lastActive: '2024-01-01T00:00:00.000Z' },
    { address: '0x1234567890abcdef1234567890abcdef12345678', username: 'ALICE.BASE.ETH', totalScore: 750, gamesPlayed: 7, isWalletUser: true, lastActive: '2024-01-01T00:00:00.000Z' },
    { address: '0xabcdef1234567890abcdef1234567890abcdef12', username: 'BOB.BASE.ETH', totalScore: 650, gamesPlayed: 4, isWalletUser: true, lastActive: '2024-01-01T00:00:00.000Z' },
    { address: '0x9876543210fedcba9876543210fedcba98765432', username: 'CHARLIE.BASE.ETH', totalScore: 550, gamesPlayed: 6, isWalletUser: true, lastActive: '2024-01-01T00:00:00.000Z' }
  ];

  return NextResponse.json({ 
    players, 
    count: players.length, 
    source: 'static-demo' 
  });
}

