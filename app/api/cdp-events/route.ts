import { NextRequest, NextResponse } from 'next/server';
import { Coinbase, SmartContract } from "@coinbase/coinbase-sdk";

// Contract configuration
const CONTRACT_CONFIG = {
  networkId: "base-mainnet",
  contractAddress: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || "0x147d35009a1992c95bDa1C85Eea210c226aCEDd4",
  contractName: "TriviaBattlev5",
  protocolName: "public"
} as const;

// Initialize CDP SDK
let coinbase: any = null;

const initializeCDP = async () => {
  try {
    // Use environment variables for CDP configuration
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    const projectId = process.env.CDP_PROJECT_ID;

    if (!apiKeyName || !apiKeyPrivateKey || !projectId) {
      throw new Error("Missing required CDP environment variables");
    }

    // Configure CDP using environment variables
    const configData = {
      apiKeyName,
      privateKey: apiKeyPrivateKey,
      projectId
    };
    
    // Try direct configuration first
    try {
      coinbase = Coinbase.configure(configData as any);
    } catch (configError) {
      // Fallback: create a temporary JSON string and use configureFromJson
      const tempConfigPath = `/tmp/cdp_config_${Date.now()}.json`;
      const fs = require('fs');
      fs.writeFileSync(tempConfigPath, JSON.stringify(configData));
      coinbase = Coinbase.configureFromJson({ filePath: tempConfigPath });
      // Clean up the temporary file
      fs.unlinkSync(tempConfigPath);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to initialize CDP:", error);
    return false;
  }
};

// Generic event fetcher
const fetchContractEvents = async (
  eventName: string,
  fromBlock?: number,
  toBlock?: number
) => {
  if (!coinbase) {
    await initializeCDP();
    if (!coinbase) {
      throw new Error("CDP not initialized. Check your environment variables.");
    }
  }

  try {
    const events = await SmartContract.listEvents(
      CONTRACT_CONFIG.networkId,
      CONTRACT_CONFIG.protocolName,
      CONTRACT_CONFIG.contractAddress,
      CONTRACT_CONFIG.contractName,
      eventName,
      fromBlock || 0,
      toBlock || 0
    );
    
    return events;
  } catch (error) {
    console.error(`Error fetching ${eventName} events:`, error);
    throw error;
  }
};

// Helper function to get current block number
const getCurrentBlockNumber = async (): Promise<number> => {
  // This is a placeholder - you might want to use a different method
  // to get the current block number from Base network
  return 0;
};

// Get recent events (last 100 blocks)
const getRecentEvents = async () => {
  try {
    // Get current block number (you might want to implement this)
    const currentBlock = await getCurrentBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100);
    
    const [
      playerJoined,
      scoreSubmitted,
      prizesDistributed,
      sessionStarted
    ] = await Promise.all([
      fetchContractEvents("PlayerJoined", fromBlock, currentBlock),
      fetchContractEvents("ScoresSubmitted", fromBlock, currentBlock),
      fetchContractEvents("PrizesDistributed", fromBlock, currentBlock),
      fetchContractEvents("SessionStarted", fromBlock, currentBlock)
    ]);

    return {
      playerJoined: playerJoined.map((event: any) => ({
        player: event.data.player,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: event.timestamp
      })),
      scoreSubmitted: scoreSubmitted.map((event: any) => ({
        sessionId: event.data.sessionId,
        playerCount: event.data.playerCount,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      })),
      prizesDistributed: prizesDistributed.map((event: any) => ({
        sessionId: event.data.sessionId,
        winners: event.data.winners,
        amounts: event.data.amounts,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: event.timestamp
      })),
      sessionStarted: sessionStarted.map((event: any) => ({
        startTime: event.data.startTime,
        endTime: event.data.endTime,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: event.timestamp
      }))
    };
  } catch (error) {
    console.error("Error fetching recent events:", error);
    throw error;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('type');
    const fromBlock = searchParams.get('fromBlock');
    const toBlock = searchParams.get('toBlock');

    if (eventType) {
      // Fetch specific event type
      const events = await fetchContractEvents(
        eventType,
        fromBlock ? parseInt(fromBlock) : undefined,
        toBlock ? parseInt(toBlock) : undefined
      );
      
      return NextResponse.json({ events });
    } else {
      // Fetch all recent events
      const events = await getRecentEvents();
      return NextResponse.json({ events });
    }
  } catch (error) {
    console.error('CDP API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CDP events' },
      { status: 500 }
    );
  }
}