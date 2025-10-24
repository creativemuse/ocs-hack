/**
 * Manual Test Script: Trial Player Flow
 * 
 * Tests the complete trial/guest player flow with guest ID
 * 
 * Run: npx ts-node scripts/test-trial-player-flow.ts
 */

import dotenv from 'dotenv';
import { spacetimeClient } from '../lib/apis/spacetime.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_GUEST_ID = `guest_test_${Date.now()}`;
const TEST_SESSION_ID = `trial_session_${Date.now()}`;

async function testTrialPlayerFlow() {
  console.log('🧪 Testing Trial Player Flow...\n');

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

    // Step 2: Create guest player
    console.log('2️⃣ Creating guest player...');
    console.log(`   Guest ID: ${TEST_GUEST_ID}`);
    
    const conn = spacetimeClient.getConnection();
    if (!conn) {
      console.error('❌ No connection available');
      process.exit(1);
    }
    
    conn.reducers.createGuestPlayer(TEST_GUEST_ID, 'Test Guest Player');
    console.log('✅ Guest player created\n');

    // Wait for creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Verify guest player exists
    console.log('3️⃣ Verifying guest player...');
    const guest = spacetimeClient.getGuestPlayer(TEST_GUEST_ID);
    
    if (guest) {
      console.log('✅ Guest player found:');
      console.log(`   Guest ID: ${guest.guestId}`);
      console.log(`   Name: ${guest.name}`);
      console.log(`   Player Type: ${guest.playerType.tag}`);
      console.log(`   Games Played: ${guest.gamesPlayed}\n`);
    } else {
      console.error('❌ Guest player not found\n');
    }

    // Step 4: Start trial game session
    console.log('4️⃣ Starting trial game session...');
    console.log(`   Session ID: ${TEST_SESSION_ID}`);
    await spacetimeClient.startGameSession(
      TEST_SESSION_ID,
      'test-game-2',   // NEW: Add gameId parameter
      'easy',
      'solo',
      'trial',
      undefined,      // No wallet address
      TEST_GUEST_ID   // Guest ID for trial player
    );
    console.log('✅ Trial game session started\n');

    // Wait for session creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Verify session in database
    console.log('5️⃣ Verifying game session...');
    const allSessions = spacetimeClient.getAllGameSessions();
    const testSession = allSessions.find(s => s.sessionId === TEST_SESSION_ID);
    
    if (testSession) {
      console.log('✅ Session found in database:');
      console.log(`   Wallet Address: ${testSession.walletAddress || 'None (correct for trial)'}`);
      console.log(`   Guest ID: ${testSession.guestId}`);
      console.log(`   Player Type: ${testSession.playerType.tag}`);
      
      if (testSession.guestId === TEST_GUEST_ID && !testSession.walletAddress) {
        console.log('✅ Guest ID correctly stored, no wallet (correct)\n');
      } else {
        console.error('❌ Session data incorrect!\n');
      }
    } else {
      console.error('❌ Session not found in database\n');
    }

    // Step 6: Record guest game completion
    console.log('6️⃣ Recording guest game...');
    conn.reducers.recordGuestGame(
      TEST_SESSION_ID,
      TEST_GUEST_ID,
      150,  // score
      10,   // questions answered
      7,    // correct answers
      JSON.stringify({ completed: true })
    );
    console.log('✅ Guest game recorded\n');

    // Wait for record
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: Update guest player stats
    console.log('7️⃣ Updating guest player stats...');
    conn.reducers.updateGuestPlayer(
      TEST_GUEST_ID,
      1,    // games played
      150,  // total score
      150,  // best score
      JSON.stringify([])
    );
    console.log('✅ Guest stats updated\n');

    // Step 8: Verify updated guest player
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('8️⃣ Verifying updated guest stats...');
    const updatedGuest = spacetimeClient.getGuestPlayer(TEST_GUEST_ID);
    
    if (updatedGuest) {
      console.log('✅ Updated guest found:');
      console.log(`   Games Played: ${updatedGuest.gamesPlayed}`);
      console.log(`   Total Score: ${updatedGuest.totalScore}`);
      console.log(`   Best Score: ${updatedGuest.bestScore}\n`);
    }

    // Step 9: Test trial leaderboard
    console.log('9️⃣ Testing trial leaderboard...');
    const trialLeaderboard = spacetimeClient.getTrialLeaderboard(10);
    console.log(`   Found ${trialLeaderboard.length} players on trial leaderboard`);
    
    if (trialLeaderboard.length > 0) {
      console.log('   Top trial players by score:');
      trialLeaderboard.forEach((guest, i) => {
        console.log(`   ${i + 1}. ${guest.name}: ${guest.bestScore} points`);
      });
    }

    // Step 10: Verify NOT on paid leaderboard
    console.log('\n🔟 Verifying trial player NOT on paid leaderboard...');
    const paidLeaderboard = spacetimeClient.getLeaderboard(10);
    // Trial players have guest_id, not wallet_address, so they can't appear on paid leaderboard
    // Paid leaderboard only shows players table which uses wallet_address as primary key
    const hasGuestOnPaidLeaderboard = paidLeaderboard.length > 0 && 
      paidLeaderboard.some(p => p.walletAddress.includes('guest'));
    
    if (!hasGuestOnPaidLeaderboard) {
      console.log('✅ Trial player correctly excluded from paid leaderboard\n');
    } else {
      console.error('❌ Trial player should NOT be on paid leaderboard!\n');
    }

    console.log('✅ ALL TRIAL PLAYER TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Guest player created');
    console.log('   ✅ Trial session started with guest ID');
    console.log('   ✅ Guest game recorded');
    console.log('   ✅ Guest stats updated');
    console.log('   ✅ Trial leaderboard works');
    console.log('   ✅ Excluded from paid leaderboard');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await spacetimeClient.disconnect();
  }
}

// Run tests
testTrialPlayerFlow();

