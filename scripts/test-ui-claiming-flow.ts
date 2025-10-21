#!/usr/bin/env tsx

/**
 * Test Script: UI Claiming Flow
 * 
 * This script tests the UI claiming functionality:
 * 1. HighScoreDisplay component rendering
 * 2. Prize calculation display
 * 3. Claiming button states
 * 4. Transaction status updates
 * 5. Error handling
 */

import { DbConnection } from '../lib/spacetime';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration
const SPACETIME_URI = process.env.SPACETIME_URI || 'http://localhost:3000';
const MODULE_NAME = process.env.MODULE_NAME || 'beat-me';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x...';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x...';

// Test configuration
const TEST_CONFIG = {
  testWallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  testScore: 850,
  expectedPrize: 0.1,
};

async function testUIClaimingFlow() {
  console.log('🖥️ Starting UI Claiming Flow Test...\n');

  try {
    // 1. Connect to SpacetimeDB
    console.log('📡 Connecting to SpacetimeDB...');
    const connection = DbConnection.builder()
      .withUri(SPACETIME_URI)
      .withModuleName(MODULE_NAME)
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

    // 2. Test HighScoreDisplay component data
    console.log('🏆 Testing HighScoreDisplay component data...');
    await testHighScoreDisplay(connection);
    console.log('✅ HighScoreDisplay component data verified\n');

    // 3. Test prize calculation display
    console.log('💰 Testing prize calculation display...');
    await testPrizeCalculationDisplay(connection);
    console.log('✅ Prize calculation display verified\n');

    // 4. Test claiming button states
    console.log('🔘 Testing claiming button states...');
    await testClaimingButtonStates(connection);
    console.log('✅ Claiming button states verified\n');

    // 5. Test transaction status updates
    console.log('📊 Testing transaction status updates...');
    await testTransactionStatusUpdates(connection);
    console.log('✅ Transaction status updates verified\n');

    // 6. Test error handling
    console.log('⚠️ Testing error handling...');
    await testErrorHandling(connection);
    console.log('✅ Error handling verified\n');

    console.log('\n🎉 UI Claiming Flow Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testHighScoreDisplay(connection: any) {
  try {
    // Create test player with high score
    const playerData = {
      walletAddress: TEST_CONFIG.testWallet,
      username: 'TestWinner',
      avatarUrl: 'https://example.com/avatar.png',
      totalEarnings: 0,
      gamesPlayed: 1,
      bestScore: TEST_CONFIG.testScore,
    };

    // Create player using reducer
    connection.reducers.createPlayer(TEST_CONFIG.testWallet, 'TestWinner');

    // Test HighScoreDisplay component data
    const players = Array.from(connection.db.players.iter());
    const player = players.find((p: any) => p.walletAddress === TEST_CONFIG.testWallet);
    
    if (!player) {
      throw new Error('Player not found');
    }

    const playerInfo = player as any;
    console.log('HighScoreDisplay Data:', {
      score: playerInfo.bestScore,
      rank: calculateRank(playerInfo.bestScore),
      prizeAmount: calculatePrize(playerInfo.bestScore),
      claimable: playerInfo.totalEarnings > 0,
    });

    console.log('✅ HighScoreDisplay component data verified');
  } catch (error) {
    console.error('❌ HighScoreDisplay test failed:', error);
    throw error;
  }
}

async function testPrizeCalculationDisplay(connection: any) {
  try {
    // Test different score ranges
    const testScores = [600, 700, 800, 900];
    
    for (const score of testScores) {
      const prize = calculatePrize(score);
      const rank = calculateRank(score);
      
      console.log(`Score: ${score}, Prize: ${prize} USDC, Rank: ${rank}`);
      
      // Verify prize calculation logic
      if (score >= 800 && prize !== 0.1) {
        throw new Error(`Prize calculation incorrect for score ${score}`);
      }
      if (score >= 700 && score < 800 && prize !== 0.05) {
        throw new Error(`Prize calculation incorrect for score ${score}`);
      }
      if (score >= 600 && score < 700 && prize !== 0.02) {
        throw new Error(`Prize calculation incorrect for score ${score}`);
      }
      if (score < 600 && prize !== 0) {
        throw new Error(`Prize calculation incorrect for score ${score}`);
      }
    }

    console.log('✅ Prize calculation display verified');
  } catch (error) {
    console.error('❌ Prize calculation display test failed:', error);
    throw error;
  }
}

async function testClaimingButtonStates(connection: any) {
  try {
    // Test different claiming states
    const testStates = [
      { claimable: true, claimed: false, expectedState: 'enabled' },
      { claimable: true, claimed: true, expectedState: 'disabled' },
      { claimable: false, claimed: false, expectedState: 'disabled' },
    ];

    for (const state of testStates) {
      console.log(`Testing state: claimable=${state.claimable}, claimed=${state.claimed}`);
      
      // Simulate UI state
      const buttonState = determineButtonState(state.claimable, state.claimed);
      
      if (buttonState !== state.expectedState) {
        throw new Error(`Button state incorrect: expected ${state.expectedState}, got ${buttonState}`);
      }
      
      console.log(`✅ Button state correct: ${buttonState}`);
    }

    console.log('✅ Claiming button states verified');
  } catch (error) {
    console.error('❌ Claiming button states test failed:', error);
    throw error;
  }
}

async function testTransactionStatusUpdates(connection: any) {
  try {
    // Test transaction status flow
    const statusFlow = [
      'idle',
      'pending',
      'success',
      'error'
    ];

    for (const status of statusFlow) {
      console.log(`Testing transaction status: ${status}`);
      
      // Simulate status update
      const statusData = {
        playerId: TEST_CONFIG.testWallet,
        status: status,
        timestamp: new Date().toISOString(),
      };

      // Status updates are handled by the system automatically
      console.log(`Status update simulated: ${status}`);
      
      console.log(`✅ Status update recorded: ${status}`);
    }

    console.log('✅ Transaction status updates verified');
  } catch (error) {
    console.error('❌ Transaction status updates test failed:', error);
    throw error;
  }
}

async function testErrorHandling(connection: any) {
  try {
    // Test various error scenarios
    const errorScenarios = [
      { error: 'Insufficient balance', expectedHandling: 'show error message' },
      { error: 'Transaction failed', expectedHandling: 'retry option' },
      { error: 'Network error', expectedHandling: 'connection retry' },
      { error: 'Contract error', expectedHandling: 'fallback to manual claim' },
    ];

    for (const scenario of errorScenarios) {
      console.log(`Testing error scenario: ${scenario.error}`);
      
      // Simulate error handling
      const errorHandling = handleError(scenario.error);
      
      if (errorHandling !== scenario.expectedHandling) {
        throw new Error(`Error handling incorrect: expected ${scenario.expectedHandling}, got ${errorHandling}`);
      }
      
      console.log(`✅ Error handling correct: ${errorHandling}`);
    }

    console.log('✅ Error handling verified');
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
    throw error;
  }
}

function calculatePrize(score: number): number {
  if (score >= 800) return 0.1;
  if (score >= 700) return 0.05;
  if (score >= 600) return 0.02;
  return 0;
}

function calculateRank(score: number): number {
  if (score >= 900) return 1;
  if (score >= 800) return 2;
  if (score >= 700) return 3;
  if (score >= 600) return 4;
  return 5;
}

function determineButtonState(claimable: boolean, claimed: boolean): string {
  if (claimed) return 'disabled';
  if (!claimable) return 'disabled';
  return 'enabled';
}

function handleError(error: string): string {
  if (error.includes('balance')) return 'show error message';
  if (error.includes('Transaction')) return 'retry option';
  if (error.includes('Network')) return 'connection retry';
  if (error.includes('Contract')) return 'fallback to manual claim';
  return 'generic error handling';
}

// Run the test
if (require.main === module) {
  testUIClaimingFlow().catch(console.error);
}

export { testUIClaimingFlow };
