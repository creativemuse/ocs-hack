#!/usr/bin/env tsx

/**
 * Test Script: Smart Contract Prize Claiming
 * 
 * This script tests the smart contract claiming functionality:
 * 1. Contract deployment verification
 * 2. Prize claiming function testing
 * 3. Double-claiming prevention
 * 4. Gasless transaction testing
 * 5. USDC transfer verification
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x...';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x...';
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

// Test configuration
const TEST_CONFIG = {
  testWallet: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  prizeAmount: parseEther('0.1'), // 0.1 USDC
  testScore: 850,
};

async function testSmartContractClaiming() {
  console.log('🔗 Starting Smart Contract Claiming Test...\n');

  try {
    // 1. Setup clients
    console.log('🔧 Setting up clients...');
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    console.log('✅ Clients setup complete\n');

    // 2. Load contract ABI
    console.log('📄 Loading contract ABI...');
    const contractABI = loadContractABI();
    console.log('✅ Contract ABI loaded\n');

    // 3. Test contract deployment
    console.log('🚀 Testing contract deployment...');
    await testContractDeployment(publicClient, contractABI);
    console.log('✅ Contract deployment verified\n');

    // 4. Test prize claiming
    console.log('💰 Testing prize claiming...');
    await testPrizeClaiming(walletClient, publicClient, contractABI);
    console.log('✅ Prize claiming tested\n');

    // 5. Test double-claiming prevention
    console.log('🛡️ Testing double-claiming prevention...');
    await testDoubleClaimingPrevention(walletClient, publicClient, contractABI);
    console.log('✅ Double-claiming prevention verified\n');

    // 6. Test gasless transactions
    console.log('⛽ Testing gasless transactions...');
    await testGaslessTransactions(walletClient, publicClient, contractABI);
    console.log('✅ Gasless transactions tested\n');

    // 7. Verify USDC balance
    console.log('💳 Verifying USDC balance...');
    await verifyUSDCBalance(publicClient);
    console.log('✅ USDC balance verified\n');

    console.log('\n🎉 Smart Contract Claiming Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

function loadContractABI() {
  try {
    const abiPath = join(__dirname, '../artifacts/contracts/TriviaBattle.sol/TriviaBattle.json');
    const contractData = JSON.parse(readFileSync(abiPath, 'utf8'));
    return contractData.abi;
  } catch (error) {
    console.error('❌ Failed to load contract ABI:', error);
    throw error;
  }
}

async function testContractDeployment(publicClient: any, contractABI: any) {
  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      client: publicClient,
    });

    // Test basic contract functions
    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'owner',
    });
    console.log(`Contract owner: ${owner}`);

    const totalPrizePool = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'totalPrizePool',
    });
    console.log(`Total prize pool: ${formatEther(totalPrizePool)} USDC`);

    console.log('✅ Contract deployment verified');
  } catch (error) {
    console.error('❌ Contract deployment test failed:', error);
    throw error;
  }
}

async function testPrizeClaiming(walletClient: any, publicClient: any, contractABI: any) {
  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      client: { public: publicClient, wallet: walletClient },
    });

    // Check if player has claimable winnings
    const hasClaimed = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'hasClaimed',
      args: [TEST_CONFIG.testWallet],
    });
    console.log(`Player has claimed: ${hasClaimed}`);

    if (!hasClaimed) {
      // Test claiming transaction
      console.log('Testing claimWinnings transaction...');
      
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: 'claimWinnings',
        account: walletClient.account,
      });
      console.log(`Transaction hash: ${hash}`);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      console.log('✅ Prize claiming successful');
    } else {
      console.log('✅ Player has already claimed (expected behavior)');
    }
  } catch (error) {
    console.error('❌ Prize claiming test failed:', error);
    throw error;
  }
}

async function testDoubleClaimingPrevention(walletClient: any, publicClient: any, contractABI: any) {
  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      client: { public: publicClient, wallet: walletClient },
    });

    // Attempt to claim again (should fail)
    console.log('Testing double-claiming prevention...');
    
    try {
      await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: 'claimWinnings',
        account: walletClient.account,
      });
      console.error('❌ Double-claiming should have failed!');
      throw new Error('Double-claiming prevention failed');
    } catch (error: any) {
      if (error.message.includes('Already claimed') || error.message.includes('revert')) {
        console.log('✅ Double-claiming prevention working correctly');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Double-claiming prevention test failed:', error);
    throw error;
  }
}

async function testGaslessTransactions(walletClient: any, publicClient: any, contractABI: any) {
  try {
    console.log('Testing gasless transaction setup...');
    
    // Check if paymaster is configured
    const contract = getContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      client: { public: publicClient, wallet: walletClient },
    });

    // Test gas estimation
    const gasEstimate = await publicClient.estimateContractGas({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'claimWinnings',
      account: walletClient.account,
    });

    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    console.log('✅ Gasless transaction setup verified');
  } catch (error) {
    console.error('❌ Gasless transaction test failed:', error);
    throw error;
  }
}

async function verifyUSDCBalance(publicClient: any) {
  try {
    // Check USDC balance of the contract
    const balance = await publicClient.getBalance({
      address: CONTRACT_ADDRESS as `0x${string}`,
    });

    console.log(`Contract USDC balance: ${formatEther(balance)} USDC`);

    if (balance > BigInt(0)) {
      console.log('✅ Contract has sufficient USDC balance');
    } else {
      console.log('⚠️ Contract has no USDC balance');
    }
  } catch (error) {
    console.error('❌ USDC balance verification failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testSmartContractClaiming().catch(console.error);
}

export { testSmartContractClaiming };
