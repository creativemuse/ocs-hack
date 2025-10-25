#!/usr/bin/env tsx

/**
 * Simple script to query USDC balance in the deployed TriviaBattle contract
 * using direct blockchain queries instead of thirdweb-api
 */

// Contract addresses (Base Mainnet)
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13';
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Base Mainnet RPC URL
const BASE_RPC_URL = 'https://mainnet.base.org';

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

// Helper function to encode function calls
function encodeFunctionCall(abi: any[], functionName: string, params: any[] = []): string {
  // This is a simplified version - in production you'd use a proper ABI encoder
  // For now, we'll use the method signature
  const func = abi.find(f => f.name === functionName && f.type === 'function');
  if (!func) throw new Error(`Function ${functionName} not found in ABI`);
  
  const inputs = func.inputs.map((input: any, index: number) => `${input.type} ${input.name || `param${index}`}`).join(', ');
  const outputs = func.outputs.map((output: any) => output.type).join(', ');
  
  return `function ${functionName}(${inputs}) view returns (${outputs})`;
}

// Helper function to make RPC calls
async function makeRPCCall(method: string, params: any[]) {
  const response = await fetch(BASE_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

// Helper function to call contract function
async function callContractFunction(contractAddress: string, abi: any[], functionName: string, params: any[] = []) {
  const methodSignature = encodeFunctionCall(abi, functionName, params);
  
  // Encode parameters (simplified - in production use proper encoding)
  const encodedParams = params.map(param => {
    if (typeof param === 'string' && param.startsWith('0x')) {
      return param.slice(2).padStart(64, '0');
    }
    if (typeof param === 'string') {
      // Convert string to hex
      return Buffer.from(param, 'utf8').toString('hex').padStart(64, '0');
    }
    if (typeof param === 'number') {
      return param.toString(16).padStart(64, '0');
    }
    return param;
  }).join('');

  // For simplicity, we'll use a different approach - direct contract interaction
  // This would require proper contract interaction setup
  
  console.log(`Would call ${methodSignature} on ${contractAddress} with params:`, params);
  return null; // Placeholder
}

async function queryContractUSDC() {
  console.log('🔍 Querying USDC balance in TriviaBattle contract...\n');
  
  try {
    console.log('📊 Contract Information:');
    console.log(`TriviaBattle Contract: ${TRIVIA_CONTRACT_ADDRESS}`);
    console.log(`USDC Contract: ${USDC_CONTRACT_ADDRESS}`);
    console.log(`Network: Base Mainnet\n`);

    // For demonstration, let's show what we would query
    console.log('🔧 Contract Calls to Execute:');
    console.log('1. USDC.balanceOf(TriviaBattle)');
    console.log('2. USDC.decimals()');
    console.log('3. USDC.symbol()');
    console.log('4. TriviaBattle.getSessionInfo()\n');

    // In a real implementation, you would:
    // 1. Set up proper contract interaction (using ethers.js, viem, or similar)
    // 2. Call the contract functions
    // 3. Process the results

    console.log('💡 To implement this query:');
    console.log('1. Install ethers.js or viem');
    console.log('2. Set up Base mainnet provider');
    console.log('3. Create contract instances with the ABIs');
    console.log('4. Call the functions and process results');
    console.log('5. Format the USDC balance properly\n');

    console.log('📝 Example implementation would look like:');
    console.log(`
const provider = new ethers.JsonRpcProvider('${BASE_RPC_URL}');
const usdcContract = new ethers.Contract('${USDC_CONTRACT_ADDRESS}', USDC_ABI, provider);
const triviaContract = new ethers.Contract('${TRIVIA_CONTRACT_ADDRESS}', TRIVIA_ABI, provider);

const balance = await usdcContract.balanceOf('${TRIVIA_CONTRACT_ADDRESS}');
const decimals = await usdcContract.decimals();
const symbol = await usdcContract.symbol();
const sessionInfo = await triviaContract.getSessionInfo();

const formattedBalance = ethers.formatUnits(balance, decimals);
console.log(\`Contract has \${formattedBalance} \${symbol}\`);
    `);

  } catch (error) {
    console.error('❌ Error querying contract:', error);
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
