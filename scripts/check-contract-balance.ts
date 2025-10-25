#!/usr/bin/env tsx

/**
 * Script to check the contract USDC balance
 * Run with: npx tsx scripts/check-contract-balance.ts
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

// Contract addresses
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13';
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

// USDC ABI for balance checking
const USDC_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

async function checkContractBalance() {
  console.log('🔍 Checking contract USDC balance...\n');

  // Create public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  });

  try {
    // Check if contract exists
    console.log('📋 Contract Information:');
    console.log(`   Address: ${TRIVIA_CONTRACT_ADDRESS}`);
    console.log(`   Network: Base Mainnet (Chain ID: ${base.id})`);
    console.log(`   RPC URL: ${RPC_URL}\n`);

    // Get USDC balance
    console.log('💰 Fetching USDC balance...');
    const balanceWei = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`],
    });

    // Get USDC decimals
    const decimals = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'decimals',
    });

    // Get USDC symbol
    const symbol = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'symbol',
    });

    // Format balance
    const balance = formatUnits(balanceWei, decimals);

    console.log('✅ Results:');
    console.log(`   Balance: ${balance} ${symbol}`);
    console.log(`   Balance (Wei): ${balanceWei.toString()}`);
    console.log(`   Decimals: ${decimals}\n`);

    if (balance === '0.0') {
      console.log('⚠️  WARNING: Contract has 0 USDC balance');
      console.log('   This could be why the prize pool is not displaying.');
      console.log('   The contract may need to receive USDC tokens from players.\n');
    } else {
      console.log('✅ Contract has USDC balance - the issue might be in the frontend.');
    }

    // Check if contract is deployed by trying to read a simple function
    console.log('🔍 Checking if contract is deployed...');
    try {
      // Try to read a simple function from the contract
      // This will fail if the contract is not deployed
      const contractCode = await publicClient.getBytecode({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      });
      
      if (contractCode && contractCode !== '0x') {
        console.log('✅ Contract is deployed and has code');
      } else {
        console.log('❌ Contract is not deployed or has no code');
        console.log('   This is likely the issue - the contract needs to be deployed first.');
      }
    } catch (error) {
      console.log('❌ Error checking contract deployment:', error);
    }

  } catch (error) {
    console.error('❌ Error checking contract balance:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('could not detect network')) {
        console.log('\n💡 Troubleshooting:');
        console.log('   - Check if the RPC URL is correct and accessible');
        console.log('   - Verify you are connected to the internet');
        console.log('   - Try a different RPC URL for Base Mainnet');
      } else if (error.message.includes('execution reverted')) {
        console.log('\n💡 Troubleshooting:');
        console.log('   - The contract might not be deployed at this address');
        console.log('   - Check if the contract address is correct');
        console.log('   - Verify the contract is deployed on Base Mainnet');
      }
    }
  }
}

// Run the check
checkContractBalance().catch(console.error);
