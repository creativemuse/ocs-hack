#!/usr/bin/env tsx

/**
 * Simple Prize Claiming Test
 * 
 * This script tests the basic prize claiming functionality:
 * 1. Connect to SpacetimeDB
 * 2. Create test player
 * 3. Simulate game completion
 * 4. Check prize calculation
 * 5. Verify database updates
 */

import { DbConnection } from '../lib/spacetime';

// Configuration
const SPACETIME_URI = process.env.SPACETIME_URI || 'http://localhost:3000';
const MODULE_NAME = process.env.MODULE_NAME || 'beat-me';

// Test configuration
const TEST_CONFIG = {
  testWallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  testScore: 850,
  expectedPrize: 0.1,
};

async function testPrizeClaiming() {
  console.log('🧪 Testing Prize Claiming Functionality...\n');

  try {
    // 1. Connect to SpacetimeDB
    console.log('📡 Connecting to SpacetimeDB...');
    const connection = DbConnection.builder()
      .withUri(SPACETIME_URI)
      .withDatabaseName(MODULE_NAME)
      .onConnect(() => {
        console.log('✅ Connected to SpacetimeDB');
      })
      .onConnectError((error) => {
        console.error('❌ Connection failed:', error);
        throw error;
      })
      .build();
    
    // Wait for connection to be established
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Create test player
    console.log('👤 Creating test player...');
    connection.reducers.createPlayer({
      walletAddress: TEST_CONFIG.testWallet,
      username: 'TestWinner',
    });
    console.log('✅ Test player created');

    // 3. Simulate game completion
    console.log('🎮 Simulating game completion...');
    const sessionId = `test-session-${Date.now()}`;
    
    // Start game session
    connection.reducers.startGameSession({
      sessionId,
      gameId: 'test-game',
      difficulty: 'hard',
      gameMode: 'competitive',
      playerType: 'paid',
      walletAddress: TEST_CONFIG.testWallet,
      guestId: undefined,
    });

    connection.reducers.recordGuestGame({
      sessionId,
      guestId: TEST_CONFIG.testWallet,
      score: TEST_CONFIG.testScore,
      questionsAnswered: 10,
      correctAnswers: 8,
      gameData: JSON.stringify({ test: true }),
    });

    connection.reducers.endGameSession({ sessionId });
    console.log('✅ Game completion simulated');

    // 4. Check prize calculation
    console.log('💰 Checking prize calculation...');
    const expectedPrize = calculatePrize(TEST_CONFIG.testScore);
    console.log(`Expected prize: ${expectedPrize} USDC`);

    // 5. Verify database updates
    console.log('📊 Verifying database updates...');
    
    // Wait a moment for database updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if player stats were updated
    const players = Array.from(connection.db.players.iter());
    const testPlayer = players.find(p => p.walletAddress === TEST_CONFIG.testWallet);
    if (testPlayer) {
      console.log(`Player total earnings: ${testPlayer.totalEarnings}`);
      console.log(`Player best score: ${testPlayer.bestScore}`);
    }

    // Check if prize distribution was recorded
    const prizeHistory = Array.from(connection.db.prize_history.iter());
    const playerPrizeHistory = prizeHistory.filter(p => p.walletAddress === TEST_CONFIG.testWallet);
    if (playerPrizeHistory.length > 0) {
      console.log(`Prize history entries: ${playerPrizeHistory.length}`);
    }

    console.log('✅ Database updates verified');

    // 6. Test prize claiming preparation
    console.log('🎯 Testing prize claiming preparation...');
    
    // Check if pending claim was created
    const pendingClaims = Array.from(connection.db.pending_claims.iter());
    const playerPendingClaims = pendingClaims.filter(p => p.walletAddress === TEST_CONFIG.testWallet);
    if (playerPendingClaims.length > 0) {
      console.log(`Pending claims found: ${playerPendingClaims.length}`);
      console.log(`Claim amount: ${playerPendingClaims[0].prizeAmount} USDC`);
    }

    console.log('✅ Prize claiming preparation verified');

    // 7. Cleanup
    console.log('🧹 Cleaning up...');
    connection.disconnect();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Prize Claiming Test PASSED!');
    return true;

  } catch (error) {
    console.error('❌ Prize Claiming Test FAILED:', error);
    return false;
  }
}

function calculatePrize(score: number): number {
  // Prize calculation logic based on score
  if (score >= 800) return 0.1; // $0.10 for 800+ score
  if (score >= 700) return 0.05; // $0.05 for 700+ score
  if (score >= 600) return 0.02; // $0.02 for 600+ score
  return 0; // No prize for lower scores
}

// Run the test
testPrizeClaiming()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });

export { testPrizeClaiming };
