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
    
    // Check if there's already an active game
    const currentGameId = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'currentGameId',
    });

    console.log('Current game ID:', currentGameId);

    // If there's already an active game, check if it's still valid
    if (Number(currentGameId) > 0) {
      try {
        const game = await publicClient.readContract({
          address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
          abi: TRIVIA_ABI,
          functionName: 'games',
          args: [currentGameId],
        });

        // Check if the game is still active and not expired
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(game[2]); // endTime is at index 2
        const isActive = game[5]; // isActive is at index 5

        if (isActive && now < endTime) {
          console.log('✅ Active game already exists, no need to create new one');
          return NextResponse.json({ 
            success: true, 
            gameId: currentGameId.toString(),
            message: 'Active game already exists' 
          });
        }
      } catch (error) {
        console.warn('Could not read game details, proceeding to create new game:', error);
      }
    }

    // Create a new game
    console.log('Creating new blockchain game...');
    const hash = await walletClient.writeContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'createGame',
    });

    console.log('Game creation transaction hash:', hash);

    // Wait for transaction to be confirmed
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      // Get the new game ID
      const newGameId = await publicClient.readContract({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'currentGameId',
      });

      console.log('✅ Blockchain game created successfully! Game ID:', newGameId);
      
      return NextResponse.json({ 
        success: true, 
        gameId: newGameId.toString(),
        transactionHash: hash,
        message: 'Blockchain game created successfully' 
      });
    } else {
      throw new Error('Game creation transaction failed');
    }

  } catch (error) {
    console.error('❌ Failed to create blockchain game:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create blockchain game',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
