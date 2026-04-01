#!/usr/bin/env tsx

/**
 * Script to query USDC balance in the deployed TriviaBattle contract using thirdweb-api
 */

// Thirdweb API configuration
const THIRDWEB_API_BASE = 'https://api.thirdweb.com/v1';
const API_KEY = process.env.THIRDWEB_API_KEY || process.env.NEXT_PUBLIC_THIRDWEB_API_KEY;

// Contract addresses (Base Mainnet)
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6';
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Base Mainnet Chain ID
const BASE_CHAIN_ID = 8453;

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

// TriviaBattle contract ABI for session info
const TRIVIA_ABI = [
  {
    type: 'function',
    name: 'getSessionInfo',
    inputs: [],
    outputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'prizePool', type: 'uint256' },
      { name: 'paidPlayerCount', type: 'uint256' },
      { name: 'trialPlayerCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'prizesDistributed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
] as const;

// Helper function to make API calls
async function makeThirdwebAPICall(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${THIRDWEB_API_BASE}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': API_KEY || '',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function queryContractUSDC() {
  console.log('🔍 Querying USDC balance in TriviaBattle contract using thirdweb-api...\n');
  
  if (!API_KEY) {
    console.error('❌ Error: THIRDWEB_API_KEY environment variable is required');
    console.log('Please set your thirdweb API key:');
    console.log('export THIRDWEB_API_KEY=your_api_key_here');
    return;
  }
  
  try {
    console.log('📊 Contract Information:');
    console.log(`TriviaBattle Contract: ${TRIVIA_CONTRACT_ADDRESS}`);
    console.log(`USDC Contract: ${USDC_CONTRACT_ADDRESS}`);
    console.log(`Network: Base Mainnet (Chain ID: ${BASE_CHAIN_ID})\n`);

    // Query USDC balance of the TriviaBattle contract
    const balanceResponse = await makeThirdwebAPICall('/contracts/read', 'POST', {
      chainId: BASE_CHAIN_ID,
      calls: [{
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: 'function balanceOf(address account) view returns (uint256)',
        params: [TRIVIA_CONTRACT_ADDRESS],
      }],
    });

    // Query USDC decimals
    const decimalsResponse = await makeThirdwebAPICall('/contracts/read', 'POST', {
      chainId: BASE_CHAIN_ID,
      calls: [{
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: 'function decimals() view returns (uint8)',
        params: [],
      }],
    });

    // Query USDC symbol
    const symbolResponse = await makeThirdwebAPICall('/contracts/read', 'POST', {
      chainId: BASE_CHAIN_ID,
      calls: [{
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: 'function symbol() view returns (string)',
        params: [],
      }],
    });

    // Query session info from TriviaBattle contract
    const sessionResponse = await makeThirdwebAPICall('/contracts/read', 'POST', {
      chainId: BASE_CHAIN_ID,
      calls: [{
        contractAddress: TRIVIA_CONTRACT_ADDRESS,
        method: 'function getSessionInfo() view returns (uint256 startTime, uint256 endTime, uint256 prizePool, uint256 paidPlayerCount, uint256 trialPlayerCount, bool isActive, bool prizesDistributed)',
        params: [],
      }],
    });

    // Process results
    if (balanceResponse.success && decimalsResponse.success && symbolResponse.success) {
      const balanceWei = BigInt(balanceResponse.result[0].result as string);
      const decimals = parseInt(decimalsResponse.result[0].result as string);
      const symbol = symbolResponse.result[0].result as string;
      
      const balance = balanceWei / BigInt(10 ** decimals);
      const remainder = balanceWei % BigInt(10 ** decimals);
      const decimalPart = Number(remainder) / (10 ** decimals);
      const totalBalance = Number(balance) + decimalPart;

      console.log('💰 USDC Balance Results:');
      console.log(`Token Symbol: ${symbol}`);
      console.log(`Contract USDC Balance: ${totalBalance.toFixed(6)} ${symbol}`);
      console.log(`Balance (Wei): ${balanceWei.toString()}`);
      console.log(`Decimals: ${decimals}\n`);

      if (totalBalance > 0) {
        console.log('✅ SUCCESS: Contract has USDC balance!');
      } else {
        console.log('❌ CONTRACT EMPTY: No USDC found in contract');
      }
    } else {
      console.error('❌ Failed to query USDC balance');
      console.error('Balance error:', balanceResponse.error);
      console.error('Decimals error:', decimalsResponse.error);
      console.error('Symbol error:', symbolResponse.error);
    }

    // Process session info
    if (sessionResponse.success) {
      const sessionData = sessionResponse.result[0].result as [string, string, string, string, string, boolean, boolean];
      const [startTime, endTime, prizePool, paidPlayerCount, trialPlayerCount, isActive, prizesDistributed] = sessionData;
      
      const prizePoolWei = BigInt(prizePool);
      const prizePoolUSDC = Number(prizePoolWei) / (10 ** 6); // USDC has 6 decimals
      
      console.log('🎮 Session Information:');
      console.log(`Session Active: ${isActive}`);
      console.log(`Prize Pool (from contract): ${prizePoolUSDC.toFixed(6)} USDC`);
      console.log(`Paid Players: ${paidPlayerCount}`);
      console.log(`Trial Players: ${trialPlayerCount}`);
      console.log(`Prizes Distributed: ${prizesDistributed}`);
      console.log(`Start Time: ${new Date(Number(startTime) * 1000).toISOString()}`);
      console.log(`End Time: ${new Date(Number(endTime) * 1000).toISOString()}\n`);
    } else {
      console.error('❌ Failed to query session info:', sessionResponse.error);
    }

  } catch (error) {
    console.error('❌ Error querying contract:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the query
if (require.main === module) {
  queryContractUSDC()
    .then(() => {
      console.log('\n🏁 Query completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { queryContractUSDC };
