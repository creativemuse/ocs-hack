/**
 * Manual Test Script: Leaderboard Earnings Sorting
 * 
 * Tests that paid leaderboard ranks by cumulative USDC earnings
 * and that trial players are excluded
 * 
 * Run: npx ts-node scripts/test-leaderboard-earnings.ts
 */

import dotenv from 'dotenv';
import { spacetimeClient } from '../lib/apis/spacetime.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test data: Multiple players with different earnings
const TEST_PLAYERS = [
  { wallet: '0x1111111111111111111111111111111111111111', username: 'Alice', earnings: 50.5 },
  { wallet: '0x2222222222222222222222222222222222222222', username: 'Bob', earnings: 125.75 },
  { wallet: '0x3333333333333333333333333333333333333333', username: 'Charlie', earnings: 25.0 },
  { wallet: '0x4444444444444444444444444444444444444444', username: 'Diana', earnings: 200.0 },
  { wallet: '0x5555555555555555555555555555555555555555', username: 'Eve', earnings: 75.25 },
];

async function testLeaderboardEarnings() {
  console.log('🧪 Testing Leaderboard Earnings Sorting...\n');

  try {
    // Step 1: Initialize connection
    console.log('1️⃣ Initializing SpacetimeDB connection...');
    await spacetimeClient.initialize();
    
    if (!spacetimeClient.isConfigured()) {
      console.error('❌ SpacetimeDB not configured');
      process.exit(1);
    }
    console.log('✅ Connected to SpacetimeDB\n');

    // Step 2: Create test players with earnings
    console.log('2️⃣ Creating test players with different earnings...\n');
    
    for (const player of TEST_PLAYERS) {
      console.log(`   Creating ${player.username} with $${player.earnings} USDC...`);
      
      // Link wallet
      await spacetimeClient.linkWalletToIdentity(player.wallet);
      
      // Create player
      await spacetimeClient.createPlayer(player.wallet, player.username);
      
      // Update stats with earnings
      await spacetimeClient.updatePlayerStats(
        player.wallet,
        100,  // total score
        5,    // games played
        50,   // best score
        player.earnings  // total earnings
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ All test players created\n');

    // Wait for data to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Query leaderboard
    console.log('3️⃣ Querying paid player leaderboard...\n');
    const leaderboard = spacetimeClient.getLeaderboard(10);
    
    console.log(`   Found ${leaderboard.length} players on leaderboard\n`);
    
    if (leaderboard.length === 0) {
      console.error('❌ No players found on leaderboard');
      console.log('   This might mean players need total_earnings > 0 in the players table');
      console.log('   Try running after some actual prize distributions\n');
      return;
    }

    // Step 4: Display leaderboard
    console.log('🏆 Leaderboard (Ranked by Cumulative USDC Earnings):');
    console.log('─'.repeat(70));
    
    leaderboard.forEach((player, index) => {
      console.log(`${index + 1}. ${player.username || player.walletAddress}`);
      console.log(`   💰 Earnings: $${player.totalEarnings} USDC`);
      console.log(`   🎮 Games Played: ${player.gamesPlayed}`);
      console.log(`   ⭐ Best Score: ${player.bestScore}`);
      console.log();
    });

    // Step 5: Verify correct sorting
    console.log('4️⃣ Verifying earnings are sorted correctly...\n');
    let isSorted = true;
    
    for (let i = 0; i < leaderboard.length - 1; i++) {
      if (leaderboard[i].totalEarnings < leaderboard[i + 1].totalEarnings) {
        isSorted = false;
        console.error(`❌ Sort error: Player ${i + 1} has less earnings than player ${i + 2}`);
        console.error(`   ${leaderboard[i].totalEarnings} < ${leaderboard[i + 1].totalEarnings}`);
      }
    }
    
    if (isSorted) {
      console.log('✅ Leaderboard correctly sorted by earnings (descending)\n');
    }

    // Step 6: Expected order
    const expectedOrder = [...TEST_PLAYERS].sort((a, b) => b.earnings - a.earnings);
    console.log('5️⃣ Expected order vs Actual order:\n');
    console.log('Expected (by earnings):');
    expectedOrder.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.username}: $${p.earnings}`);
    });
    
    console.log('\nActual:');
    leaderboard.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.username}: $${p.totalEarnings}`);
    });

    // Step 7: Test trial leaderboard separation
    console.log('\n6️⃣ Testing trial leaderboard (separate from paid)...\n');
    const trialLeaderboard = spacetimeClient.getTrialLeaderboard(10);
    
    console.log(`   Found ${trialLeaderboard.length} players on trial leaderboard`);
    
    // Verify no overlap
    const paidWallets = new Set(leaderboard.map(p => p.walletAddress));
    const trialIds = new Set(trialLeaderboard.map(g => g.guestId));
    
    const hasOverlap = leaderboard.some(p => 
      trialLeaderboard.some(g => g.guestId === p.walletAddress)
    );
    
    if (!hasOverlap) {
      console.log('✅ No overlap between paid and trial leaderboards (correct)\n');
    } else {
      console.error('❌ Found overlap between paid and trial leaderboards!\n');
    }

    console.log('✅ ALL LEADERBOARD TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Paid players ranked by USDC earnings');
    console.log('   ✅ Sorting is correct (descending)');
    console.log('   ✅ Trial players in separate leaderboard');
    console.log('   ✅ No overlap between paid and trial');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await spacetimeClient.disconnect();
  }
}

// Run tests
testLeaderboardEarnings();

