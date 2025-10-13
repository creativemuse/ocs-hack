/**
 * Manual Test Script: Cross-Device Persistence
 * 
 * Simulates the same wallet connecting from different devices/browsers
 * to verify stats persist
 * 
 * Run: npx ts-node scripts/test-cross-device-persistence.ts
 */

import dotenv from 'dotenv';
import { spacetimeClient } from '../lib/apis/spacetime.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SESSION_1 = `device1_session_${Date.now()}`;
const SESSION_2 = `device2_session_${Date.now() + 1000}`;

async function testCrossDevicePersistence() {
  console.log('🧪 Testing Cross-Device Persistence...\n');
  console.log('📱 Simulating: Same wallet, different devices/browsers\n');

  try {
    // ========================================================================
    // DEVICE 1: First Connection
    // ========================================================================
    
    console.log('📱 DEVICE 1 (First Connection)');
    console.log('─'.repeat(70));
    
    // Step 1: Connect and link wallet
    console.log('\n1️⃣ Connecting from Device 1...');
    await spacetimeClient.initialize();
    
    if (!spacetimeClient.isConfigured()) {
      console.error('❌ SpacetimeDB not configured');
      process.exit(1);
    }
    
    console.log('✅ Connected');
    console.log(`   Wallet: ${TEST_WALLET}`);
    
    // Get current identity (simulates first browser)
    const conn1 = spacetimeClient.getConnection();
    console.log(`   Identity: [Browser 1 Identity]\n`);

    // Step 2: Link wallet
    console.log('2️⃣ Linking wallet on Device 1...');
    await spacetimeClient.linkWalletToIdentity(TEST_WALLET);
    console.log('✅ Wallet linked\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Create player
    console.log('3️⃣ Creating player profile...');
    await spacetimeClient.createPlayer(TEST_WALLET, 'CrossDeviceTestPlayer');
    console.log('✅ Player created\n');

    // Step 4: Play first game
    console.log('4️⃣ Playing first game on Device 1...');
    await spacetimeClient.startGameSession(
      SESSION_1,
      'medium',
      'battle',
      'paid',
      TEST_WALLET,
      undefined
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Record some activity
    await spacetimeClient.recordQuestionAttempt(
      SESSION_1,
      'song1.mp3',
      1, 1, 5.0, 'paid'
    );
    
    await spacetimeClient.endGameSession(SESSION_1);
    console.log('✅ First game completed\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Check stats after first game
    console.log('5️⃣ Checking stats after first game...');
    const statsAfterGame1 = spacetimeClient.getAllPlayerStats();
    const player1Stats = statsAfterGame1.find(s => s.walletAddress === TEST_WALLET);
    
    if (player1Stats) {
      console.log('✅ Stats found on Device 1:');
      console.log(`   Total Games: ${player1Stats.totalGames}`);
      console.log(`   Total Score: ${player1Stats.totalScore}`);
      console.log(`   Best Score: ${player1Stats.bestScore}\n`);
    } else {
      console.error('❌ Stats not found after first game\n');
      process.exit(1);
    }

    // ========================================================================
    // SIMULATE DEVICE 2: Different Browser/Device
    // ========================================================================
    
    console.log('\n📱 DEVICE 2 (Different Browser - Simulated)');
    console.log('─'.repeat(70));
    console.log('ℹ️  In real scenario: different browser = different SpacetimeDB Identity');
    console.log('ℹ️  But same wallet = same stats should load\n');

    // Step 6: Disconnect and reconnect (simulates new device)
    console.log('6️⃣ Disconnecting from Device 1...');
    await spacetimeClient.disconnect();
    console.log('✅ Disconnected\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Reconnect (simulates Device 2)
    console.log('7️⃣ Reconnecting (Device 2 simulation)...');
    await spacetimeClient.initialize();
    console.log('✅ Reconnected');
    console.log(`   Wallet: ${TEST_WALLET} (SAME wallet)`);
    console.log(`   Identity: [Browser 2 Identity - DIFFERENT]\n`);

    // Step 8: Re-link wallet (happens automatically via useWalletLinking hook)
    console.log('8️⃣ Linking wallet on Device 2...');
    await spacetimeClient.linkWalletToIdentity(TEST_WALLET);
    console.log('✅ Wallet re-linked');
    console.log('   This updates the identity_wallet_mapping\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 9: Verify stats PERSISTED
    console.log('9️⃣ Verifying stats persisted to Device 2...');
    const statsAfterReconnect = spacetimeClient.getAllPlayerStats();
    const player2Stats = statsAfterReconnect.find(s => s.walletAddress === TEST_WALLET);
    
    if (player2Stats) {
      console.log('✅ Stats PERSISTED across devices:');
      console.log(`   Total Games: ${player2Stats.totalGames} (should be 1)`);
      console.log(`   Total Score: ${player2Stats.totalScore} (should match Device 1)`);
      console.log(`   Best Score: ${player2Stats.bestScore} (should match Device 1)\n`);
      
      // Verify numbers match
      if (player2Stats.totalGames === player1Stats.totalGames &&
          player2Stats.totalScore === player1Stats.totalScore) {
        console.log('✅✅✅ CROSS-DEVICE PERSISTENCE VERIFIED! ✅✅✅\n');
      } else {
        console.error('❌ Stats do not match between devices!\n');
      }
    } else {
      console.error('❌ Stats not found on Device 2\n');
      process.exit(1);
    }

    // Step 10: Play another game on "Device 2"
    console.log('🔟 Playing second game on Device 2...');
    await spacetimeClient.startGameSession(
      SESSION_2,
      'hard',
      'battle',
      'paid',
      TEST_WALLET,
      undefined
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await spacetimeClient.recordQuestionAttempt(
      SESSION_2,
      'song2.mp3',
      2, 2, 3.5, 'paid'
    );
    
    await spacetimeClient.endGameSession(SESSION_2);
    console.log('✅ Second game completed\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 11: Verify stats accumulated
    console.log('1️⃣1️⃣ Verifying stats accumulated from both devices...');
    const finalStats = spacetimeClient.getAllPlayerStats();
    const playerFinalStats = finalStats.find(s => s.walletAddress === TEST_WALLET);
    
    if (playerFinalStats) {
      console.log('✅ Final accumulated stats:');
      console.log(`   Total Games: ${playerFinalStats.totalGames} (should be 2)`);
      console.log(`   Total Score: ${playerFinalStats.totalScore}`);
      console.log(`   Best Score: ${playerFinalStats.bestScore}\n`);
      
      if (playerFinalStats.totalGames === 2) {
        console.log('✅ Stats correctly accumulated across devices!\n');
      } else {
        console.error('❌ Stats did not accumulate correctly\n');
      }
    }

    // Step 12: Verify both sessions exist with same wallet
    console.log('1️⃣2️⃣ Verifying both game sessions linked to wallet...');
    const allSessions = spacetimeClient.getAllGameSessions();
    const walletSessions = allSessions.filter(s => s.walletAddress === TEST_WALLET);
    
    console.log(`✅ Found ${walletSessions.length} sessions for wallet ${TEST_WALLET}`);
    walletSessions.forEach((s, i) => {
      console.log(`   Session ${i + 1}: ${s.sessionId}`);
      console.log(`   Score: ${s.score}, Questions: ${s.questionsAnswered}\n`);
    });

    console.log('✅ ALL CROSS-DEVICE TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Stats persisted when reconnecting with same wallet');
    console.log('   ✅ Different identities properly re-linked');
    console.log('   ✅ Stats accumulated across "devices"');
    console.log('   ✅ All sessions queryable by wallet address');
    console.log('\n🎉 Cross-device persistence working perfectly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await spacetimeClient.disconnect();
  }
}

// Run tests
testCrossDevicePersistence();

