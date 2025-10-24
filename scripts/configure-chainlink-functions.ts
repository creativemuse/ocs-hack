#!/usr/bin/env tsx

/**
 * Configure Chainlink Functions for TriviaBattlev4 Contract
 * 
 * This script configures the deployed contract with the proper Chainlink Functions parameters
 * for Base Mainnet integration with your SpacetimeDB backend.
 */

import { ethers } from 'ethers';
import { TRIVIABATTLEV4_ABI } from '../lib/blockchain/triviabattlev4-abi';
import fs from 'fs';

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
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Base Mainnet Chainlink Functions Configuration
const CONFIG = {
  // Your Chainlink Functions subscription ID (you need to create this)
  subscriptionId: process.env.CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID,
  
  // Gas limit for Functions execution
  gasLimit: 300000,
  
  // Base Mainnet DON ID (32 bytes) - fun-base-mainnet-1
  donID: '0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000',
  
  // JavaScript source code (will be loaded from file)
  rankingSource: ''
};

async function loadRankingSource(): Promise<string> {
  const sourcePath = path.join(__dirname, '../chainlink-functions-source-minified.js');
  return fs.readFileSync(sourcePath, 'utf8');
}

async function configureContract() {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  if (!CONFIG.subscriptionId) {
    throw new Error('CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID environment variable is required');
  }

  console.log('🔧 Configuring Chainlink Functions for TriviaBattlev4...');
  console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Base Mainnet`);
  console.log(`📡 RPC: ${RPC_URL}`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Connect to contract
  const contract = new ethers.Contract(CONTRACT_ADDRESS, TRIVIABATTLEV4_ABI, signer);
  
  // Load ranking source code
  CONFIG.rankingSource = await loadRankingSource();
  console.log(`📄 Loaded ranking source (${CONFIG.rankingSource.length} chars)`);

  try {
    // Check current configuration
    console.log('\n📊 Current Contract Configuration:');
    const currentConfig = await Promise.all([
      contract.subscriptionId(),
      contract.gasLimit(),
      contract.donID(),
      contract.rankingSource(),
      contract.useChainlinkFunctions()
    ]);
    
    console.log(`  Subscription ID: ${currentConfig[0]}`);
    console.log(`  Gas Limit: ${currentConfig[1]}`);
    console.log(`  DON ID: ${currentConfig[2]}`);
    console.log(`  Ranking Source: ${currentConfig[3] ? 'Set' : 'Not Set'}`);
    console.log(`  Functions Enabled: ${currentConfig[4]}`);

    // Update configuration
    console.log('\n⚙️  Updating Functions Configuration...');
    const tx = await contract.updateFunctionsConfig(
      CONFIG.subscriptionId,
      CONFIG.gasLimit,
      CONFIG.donID,
      CONFIG.rankingSource
    );
    
    console.log(`📝 Transaction Hash: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Configuration updated! Gas used: ${receipt.gasUsed}`);
    
    // Verify configuration
    console.log('\n🔍 Verifying Configuration:');
    const newConfig = await Promise.all([
      contract.subscriptionId(),
      contract.gasLimit(),
      contract.donID(),
      contract.rankingSource(),
      contract.useChainlinkFunctions()
    ]);
    
    console.log(`  ✅ Subscription ID: ${newConfig[0]}`);
    console.log(`  ✅ Gas Limit: ${newConfig[1]}`);
    console.log(`  ✅ DON ID: ${newConfig[2]}`);
    console.log(`  ✅ Ranking Source: ${newConfig[3] ? 'Set' : 'Not Set'}`);
    console.log(`  ✅ Functions Enabled: ${newConfig[4]}`);

    console.log('\n🎉 Chainlink Functions configuration complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the integration by creating a game');
    console.log('2. Have players enter the game');
    console.log('3. End the game and trigger rankings request');
    console.log('4. Monitor Chainlink Functions execution');
    console.log('5. Verify automation finalizes the game');

  } catch (error) {
    console.error('❌ Configuration failed:', error);
    throw error;
  }
}

async function testContractConnection() {
  console.log('🔍 Testing contract connection...');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, TRIVIABATTLEV4_ABI, provider);
  
  try {
    const currentGameId = await contract.currentGameId();
    const canCreateNewGame = await contract.canCreateNewGame();
    const useChainlinkFunctions = await contract.useChainlinkFunctions();
    
    console.log(`✅ Contract connected successfully!`);
    console.log(`  Current Game ID: ${currentGameId}`);
    console.log(`  Can Create New Game: ${canCreateNewGame}`);
    console.log(`  Chainlink Functions Enabled: ${useChainlinkFunctions}`);
    
    return true;
  } catch (error) {
    console.error('❌ Contract connection failed:', error);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 TriviaBattlev4 Chainlink Functions Configuration\n');
    
    // Test connection first
    const connected = await testContractConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // Configure the contract
    await configureContract();
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

export { configureContract, testContractConnection };
