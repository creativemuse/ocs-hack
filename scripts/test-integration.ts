#!/usr/bin/env tsx

/**
 * Test TriviaBattlev4 Integration
 * 
 * This script tests the complete integration flow:
 * 1. Contract configuration
 * 2. Game creation
 * 3. Player entry simulation
 * 4. Rankings request
 * 5. Automation verification
 */

import { ethers } from 'ethers';
import { TRIVIABATTLEV4_ABI } from '../lib/blockchain/triviabattlev4-abi';
import { USDC_CONTRACT_ADDRESS_EXPORT } from '../lib/blockchain/contracts';

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const CONTRACT_ADDRESS = '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13';
const USDC_ADDRESS = USDC_CONTRACT_ADDRESS_EXPORT;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Test configuration
const TEST_PLAYERS = [
  '0x742d35Cc6634C0532925a3b8D0C0C1C1C1C1C1C1', // Mock player 1
  '0x8ba1f109551bD432803012645Hac136c4C1C1C1C1', // Mock player 2
  '0x9cA1f109551bD432803012645Hac136c4C1C1C1C1', // Mock player 3
];

async function testContractIntegration() {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  console.log('🧪 Testing TriviaBattlev4 Integration...\n');

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Connect to contracts
  const triviaContract = new ethers.Contract(CONTRACT_ADDRESS, TRIVIABATTLEV4_ABI, signer);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address, uint256) returns (bool)',
    'function allowance(address, address) view returns (uint256)'
  ], signer);

  try {
    // 1. Check contract state
    console.log('📊 Contract State Check:');
    const currentGameId = await triviaContract.currentGameId();
    const canCreateNewGame = await triviaContract.canCreateNewGame();
    const useChainlinkFunctions = await triviaContract.useChainlinkFunctions();
    const subscriptionId = await triviaContract.subscriptionId();
    const donID = await triviaContract.donID();
    
    console.log(`  Current Game ID: ${currentGameId}`);
    console.log(`  Can Create New Game: ${canCreateNewGame}`);
    console.log(`  Chainlink Functions Enabled: ${useChainlinkFunctions}`);
    console.log(`  Subscription ID: ${subscriptionId}`);
    console.log(`  DON ID: ${donID}`);
    
    if (!useChainlinkFunctions) {
      console.log('⚠️  Chainlink Functions is disabled. Enable it first.');
      return;
    }
    
    if (subscriptionId === 0) {
      console.log('⚠️  Subscription ID not set. Configure Chainlink Functions first.');
      return;
    }

    // 2. Check USDC balance and approval
    console.log('\n💰 USDC Balance Check:');
    const balance = await usdcContract.balanceOf(await signer.getAddress());
    const entryFee = await triviaContract.ENTRY_FEE();
    
    console.log(`  USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
    console.log(`  Entry Fee: ${ethers.formatUnits(entryFee, 6)} USDC`);
    
    if (balance < entryFee) {
      console.log('⚠️  Insufficient USDC balance for testing');
      return;
    }

    // 3. Create a new game
    console.log('\n🎮 Creating New Game:');
    if (canCreateNewGame) {
      const createTx = await triviaContract.createGame();
      console.log(`  Transaction: ${createTx.hash}`);
      await createTx.wait();
      console.log('  ✅ Game created successfully');
    } else {
      console.log('  ⚠️  Cannot create new game (previous game still active)');
    }

    // 4. Get game info
    const newGameId = await triviaContract.currentGameId();
    console.log(`\n📋 Game ${newGameId} Info:`);
    
    const gameInfo = await triviaContract.getGameInfo(newGameId);
    console.log(`  Prize Pool: ${ethers.formatUnits(gameInfo.prizePool, 6)} USDC`);
    console.log(`  Player Count: ${gameInfo.playerCount}`);
    console.log(`  Start Time: ${new Date(Number(gameInfo.startTime) * 1000).toISOString()}`);
    console.log(`  End Time: ${new Date(Number(gameInfo.endTime) * 1000).toISOString()}`);
    console.log(`  Is Active: ${gameInfo.isActive}`);
    console.log(`  Is Finalized: ${gameInfo.isFinalized}`);
    console.log(`  Rankings Submitted: ${gameInfo.rankingsSubmitted}`);

    // 5. Test player entry (simulation)
    console.log('\n👥 Testing Player Entry:');
    const playerAddress = await signer.getAddress();
    
    // Check if already entered
    const hasEntered = await triviaContract.hasPlayerEntered(newGameId, playerAddress);
    if (hasEntered) {
      console.log('  ⚠️  Player already entered this game');
    } else {
      // Approve USDC
      console.log('  Approving USDC...');
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, entryFee);
      await approveTx.wait();
      console.log('  ✅ USDC approved');
      
      // Enter game
      console.log('  Entering game...');
      const enterTx = await triviaContract.enterGame();
      console.log(`  Transaction: ${enterTx.hash}`);
      await enterTx.wait();
      console.log('  ✅ Player entered successfully');
    }

    // 6. Check updated game state
    console.log('\n📊 Updated Game State:');
    const updatedGameInfo = await triviaContract.getGameInfo(newGameId);
    console.log(`  Prize Pool: ${ethers.formatUnits(updatedGameInfo.prizePool, 6)} USDC`);
    console.log(`  Player Count: ${updatedGameInfo.playerCount}`);
    console.log(`  Platform Fee: ${ethers.formatUnits(updatedGameInfo.platformFee, 6)} USDC`);

    // 7. Test time remaining
    const timeRemaining = await triviaContract.getTimeRemaining();
    console.log(`\n⏰ Time Remaining: ${timeRemaining} seconds`);
    
    if (timeRemaining > 0) {
      console.log(`  Game will end in ${Math.floor(timeRemaining / 60)} minutes and ${timeRemaining % 60} seconds`);
    } else {
      console.log('  Game has ended');
    }

    // 8. Test rankings request (if game has ended)
    if (timeRemaining === 0) {
      console.log('\n🏆 Testing Rankings Request:');
      const isReadyToFinalize = await triviaContract.isGameReadyToFinalize(newGameId);
      console.log(`  Ready to Finalize: ${isReadyToFinalize}`);
      
      if (!updatedGameInfo.rankingsSubmitted) {
        console.log('  Requesting rankings via Chainlink Functions...');
        try {
          const rankingsTx = await triviaContract.requestRankings(newGameId);
          console.log(`  Transaction: ${rankingsTx.hash}`);
          await rankingsTx.wait();
          console.log('  ✅ Rankings request submitted');
        } catch (error) {
          console.log('  ⚠️  Rankings request failed:', error instanceof Error ? error.message : String(error));
        }
      } else {
        console.log('  Rankings already submitted');
      }
    }

    console.log('\n🎉 Integration test completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Monitor Chainlink Functions execution');
    console.log('2. Wait for rankings to be submitted');
    console.log('3. Verify automation finalizes the game');
    console.log('4. Test prize claiming for winners');

  } catch (error) {
    console.error('❌ Integration test failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function checkUpkeepStatus() {
  console.log('🔍 Checking Upkeep Status...');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, TRIVIABATTLEV4_ABI, provider);
  
  try {
    const currentGameId = await contract.currentGameId();
    if (currentGameId === 0) {
      console.log('  No active games');
      return;
    }
    
    const gameInfo = await contract.getGameInfo(currentGameId);
    const isReadyToFinalize = await contract.isGameReadyToFinalize(currentGameId);
    
    console.log(`  Game ${currentGameId}:`);
    console.log(`    Active: ${gameInfo.isActive}`);
    console.log(`    Finalized: ${gameInfo.isFinalized}`);
    console.log(`    Rankings Submitted: ${gameInfo.rankingsSubmitted}`);
    console.log(`    Ready to Finalize: ${isReadyToFinalize}`);
    
    if (isReadyToFinalize) {
      console.log('  ✅ Upkeep should trigger soon');
    } else {
      console.log('  ⏳ Waiting for conditions to be met');
    }
    
  } catch (error) {
    console.error('❌ Upkeep check failed:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  try {
    console.log('🚀 TriviaBattlev4 Integration Test\n');
    
    await testContractIntegration();
    await checkUpkeepStatus();
    
  } catch (error) {
    console.error('💥 Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
main();

export { testContractIntegration, checkUpkeepStatus };
