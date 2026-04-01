import { NextRequest, NextResponse } from 'next/server';
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

// Contract addresses from environment
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Check if CDP API is configured (support both old and new env var names)
    const hasConfig = (process.env.CDP_API_KEY && process.env.CDP_API_SECRET) || 
                      (process.env.KEY_NAME && process.env.KEY_SECRET);
    
    if (!hasConfig) {
      return NextResponse.json(
        { error: 'CDP API not configured. Add CDP_API_KEY and CDP_API_SECRET to .env.local' },
        { status: 503 }
      );
    }

    console.log(`🔍 Fetching profile for player: ${address}`);
    
    // Create CDP SQL client
    const sqlClient = createCDPSQLClient();
    
    // Get player profile from blockchain data
    const profile = await sqlClient.getPlayerProfile(
      address,
      TRIVIA_CONTRACT_ADDRESS,
      USDC_ADDRESS
    );

    if (!profile) {
      return NextResponse.json(
        { error: 'Player profile not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Retrieved profile for ${address}`);

    // Transform to our format
    const playerProfile = {
      address,
      totalGames: parseInt(profile.total_games) || 0,
      perfectRounds: parseInt(profile.perfect_rounds) || 0,
      totalEarnings: Math.round(profile.total_earnings || 0),
      payoutCount: parseInt(profile.payout_count) || 0,
      highestPayout: Math.round(profile.highest_payout || 0),
      firstGame: profile.first_game,
      lastGame: profile.last_game,
      source: 'cdp-sql-api'
    };

    return NextResponse.json(playerProfile);

  } catch (error) {
    console.error('❌ Error fetching player profile:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch player profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

