import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

/**
 * Start a SpacetimeDB game session
 * This should be called after game entry is verified
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      sessionId, 
      difficulty = 'medium', 
      gameMode = 'battle',
      playerType,  // 'paid' or 'trial'
      walletAddress,  // Required for paid
      guestId         // Required for trial
    } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (!playerType) {
      return NextResponse.json({ error: 'playerType required' }, { status: 400 });
    }

    if (playerType === 'paid' && !walletAddress) {
      return NextResponse.json({ error: 'walletAddress required for paid players' }, { status: 400 });
    }

    if (playerType === 'trial' && !guestId) {
      return NextResponse.json({ error: 'guestId required for trial players' }, { status: 400 });
    }

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();

    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json({ 
        success: false, 
        error: 'SpacetimeDB not configured' 
      }, { status: 503 });
    }

    // Link wallet for paid players
    if (playerType === 'paid' && walletAddress) {
      try {
        await spacetimeClient.linkWalletToIdentity(walletAddress);
        console.log(`✅ Wallet ${walletAddress} linked to SpacetimeDB identity`);
      } catch (linkError) {
        console.warn('⚠️ Failed to link wallet, continuing anyway:', linkError);
      }
    }

    // Start SpacetimeDB game session
    await spacetimeClient.startGameSession(
      sessionId,
      difficulty,
      gameMode,
      playerType,
      walletAddress,
      guestId
    );

    console.log(`✅ Started SpacetimeDB session: ${sessionId} (${playerType})`);

    return NextResponse.json({ 
      success: true,
      sessionId,
      playerType,
      playerId: walletAddress || guestId
    });

  } catch (error) {
    console.error('Error starting SpacetimeDB session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to start session',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

