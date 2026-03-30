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

    // Check session interval before attempting to start a new session
    const lastSessionTime = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'lastSessionTime',
    });

    const sessionInterval = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'sessionInterval',
    });

    // Get current block timestamp
    const blockNumber = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ blockNumber });
    const currentTime = BigInt(block.timestamp);
    const lastSession = BigInt(lastSessionTime.toString());
    const interval = BigInt(sessionInterval.toString());
    const nextSessionTime = lastSession + interval;

    console.log('Last session time:', lastSessionTime);
    console.log('Session interval:', sessionInterval);
    console.log('Current time:', currentTime);
    console.log('Next session time:', nextSessionTime);

    // Check if enough time has elapsed
    if (currentTime < nextSessionTime) {
      const timeRemaining = Number(nextSessionTime - currentTime);
      const daysRemaining = Math.floor(timeRemaining / 86400);
      const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      const secondsRemaining = timeRemaining % 60;
      const nextSessionDate = new Date(Number(nextSessionTime) * 1000);
      
      let timeMessage = '';
      if (daysRemaining > 0) {
        timeMessage = `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}, ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
      } else if (hoursRemaining > 0) {
        timeMessage = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}, ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
      } else if (minutesRemaining > 0) {
        timeMessage = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}, ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}`;
      } else {
        timeMessage = `${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}`;
      }

      console.log(`⏳ Session interval not elapsed. Time remaining: ${timeMessage}`);
      console.log(`Next session can start at: ${nextSessionDate.toISOString()}`);

      return NextResponse.json(
        { 
          success: false,
          error: 'Session interval not elapsed',
          message: `Cannot start a new session yet. Please wait ${timeMessage} before starting the next session.`,
          timeRemaining: timeRemaining,
          timeRemainingFormatted: timeMessage,
          nextSessionTime: nextSessionTime.toString(),
          nextSessionDate: nextSessionDate.toISOString(),
        },
        { status: 429 } // 429 Too Many Requests is appropriate for rate limiting
      );
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
