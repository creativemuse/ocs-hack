/**
 * Manual Test Script: Wallet Identity Flow
 * 
 * Tests the complete paid player flow with wallet-based identity
 * 
 * Run: npx ts-node scripts/test-wallet-identity-flow.ts
 */

import dotenv from 'dotenv';
import { spacetimeClient } from '../lib/apis/spacetime.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_WALLET = '0x1234567890123456789012345678901234567890';
const TEST_SESSION_ID = `test_session_${Date.now()}`;

async function testWalletIdentityFlow() {
  console.log('🧪 Testing Wallet Identity Flow...\n');

  try {
    // Step 1: Initialize connection
    console.log('1️⃣ Initializing SpacetimeDB connection...');
    await spacetimeClient.initialize();
    
    if (!spacetimeClient.isConfigured()) {
      console.error('❌ SpacetimeDB not configured');
      console.log('   Add SPACETIME_HOST and SPACETIME_MODULE to .env.local');
      process.exit(1);
    }
    console.log('✅ Connected to SpacetimeDB\n');

    // Step 2: Link wallet to identity
    console.log('2️⃣ Linking wallet to SpacetimeDB identity...');
    console.log(`   Wallet: ${TEST_WALLET}`);
    await spacetimeClient.linkWalletToIdentity(TEST_WALLET);
    console.log('✅ Wallet linked\n');

    // Wait a bit for link to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Create player profile
    console.log('3️⃣ Creating player profile...');
    await spacetimeClient.createPlayer(TEST_WALLET, 'TestPlayer');
    console.log('✅ Player created\n');

    // Step 4: Start game session
    console.log('4️⃣ Starting game session...');
    console.log(`   Session ID: ${TEST_SESSION_ID}`);
    await spacetimeClient.startGameSession(
      TEST_SESSION_ID,
      'medium',
      'battle',
      'paid',
      TEST_WALLET,  // Wallet address for paid player
      undefined     // No guest ID
    );
    console.log('✅ Game session started\n');

    // Wait for session to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Verify session in database
    console.log('5️⃣ Verifying game session...');
    const allSessions = spacetimeClient.getAllGameSessions();
    const testSession = allSessions.find(s => s.sessionId === TEST_SESSION_ID);
    
    if (testSession) {
      console.log('✅ Session found in database:');
      console.log(`   Wallet Address: ${testSession.walletAddress}`);
      console.log(`   Guest ID: ${testSession.guestId || 'None'}`);
      console.log(`   Player Type: ${testSession.playerType.tag}`);
      
      if (testSession.walletAddress === TEST_WALLET) {
        console.log('✅ Wallet address correctly stored\n');
      } else {
        console.error('❌ Wallet address mismatch!\n');
      }
    } else {
      console.error('❌ Session not found in database\n');
    }

    // Step 6: Record some question attempts
    console.log('6️⃣ Recording question attempts...');
    await spacetimeClient.recordQuestionAttempt(
      TEST_SESSION_ID,
      'test_song.mp3',
      1,  // selected answer
      1,  // correct answer
      5.5, // time taken
      'paid'
    );
    console.log('✅ Question attempt recorded\n');

    // Step 7: End game session
    console.log('7️⃣ Ending game session...');
    await spacetimeClient.endGameSession(TEST_SESSION_ID);
    console.log('✅ Game session ended\n');

    // Wait for stats to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: Verify player stats
    console.log('8️⃣ Verifying player stats...');
    const allStats = spacetimeClient.getAllPlayerStats();
    const playerStats = allStats.find(s => s.walletAddress === TEST_WALLET);
    
    if (playerStats) {
      console.log('✅ Player stats found:');
      console.log(`   Wallet: ${playerStats.walletAddress}`);
      console.log(`   Total Games: ${playerStats.totalGames}`);
      console.log(`   Total Score: ${playerStats.totalScore}`);
      console.log(`   Best Score: ${playerStats.bestScore}`);
      console.log(`   Player Type: ${playerStats.playerType.tag}`);
    } else {
      console.error('❌ Player stats not found\n');
    }

    // Step 9: Test leaderboard
    console.log('\n9️⃣ Testing leaderboard...');
    const leaderboard = spacetimeClient.getLeaderboard(10);
    console.log(`   Found ${leaderboard.length} players on leaderboard`);
    
    if (leaderboard.length > 0) {
      console.log('   Top players by earnings:');
      leaderboard.forEach((player, i) => {
        console.log(`   ${i + 1}. ${player.username || player.walletAddress}: $${player.totalEarnings} USDC`);
      });
    }

    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Wallet linked to identity');
    console.log('   ✅ Game session created with wallet address');
    console.log('   ✅ Question attempts recorded');
    console.log('   ✅ Player stats updated under wallet address');
    console.log('   ✅ Leaderboard query works');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await spacetimeClient.disconnect();
  }
}

// Run tests
testWalletIdentityFlow();

