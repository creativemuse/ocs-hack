import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';

// Create a client for blockchain interactions
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// Create wallet client for contract owner operations
const account = privateKeyToAccount(process.env.CONTRACT_OWNER_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export async function POST(req: NextRequest) {
  try {
    console.log('🎮 Creating blockchain game session...');
    
    // Validate environment variables
    if (!process.env.CONTRACT_OWNER_PRIVATE_KEY) {
      console.error('❌ CONTRACT_OWNER_PRIVATE_KEY is missing');
      return NextResponse.json(
        { 
          success: false,
          error: 'Server configuration error',
          details: 'CONTRACT_OWNER_PRIVATE_KEY environment variable is missing'
        },
        { status: 500 }
      );
    }
    
    // Check if there's already an active session
    const isSessionActive = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'isSessionActive',
    });

    const sessionCounter = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'sessionCounter',
    });

    console.log('Current session counter:', sessionCounter);
    console.log('Is session active:', isSessionActive);

    // If there's already an active session, return it
    if (isSessionActive) {
      console.log('✅ Active session already exists, no need to create new one');
      return NextResponse.json({ 
        success: true, 
        sessionId: sessionCounter.toString(),
        message: 'Active session already exists' 
      });
    }

    // Start a new session
    console.log('Starting new blockchain game session...');
    const hash = await walletClient.writeContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'startNewSession',
    });

    console.log('Session start transaction hash:', hash);

    // Wait for transaction to be confirmed
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      // Get the new session counter (it will be incremented by startNewSession)
      const newSessionCounter = await publicClient.readContract({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
      });

      console.log('✅ Blockchain game session started successfully! Session ID:', newSessionCounter);
      
      return NextResponse.json({ 
        success: true, 
        sessionId: newSessionCounter.toString(),
        transactionHash: hash,
        message: 'Blockchain game session started successfully' 
      });
    } else {
      throw new Error('Session start transaction failed');
    }

  } catch (error) {
    console.error('❌ Failed to start blockchain game session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to start blockchain game session',
        details: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: errorDetails })
      },
      { status: 500 }
    );
  }
}
