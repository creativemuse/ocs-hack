import { createCDPJWTGenerator } from '../cdp/jwt-generator';

// Contract configuration
export const CONTRACT_CONFIG = {
  networkId: "base-mainnet",
  contractAddress: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
  contractName: "TriviaBattle",
  protocolName: "public"
} as const;

// JWT token cache for efficient API calls
let cachedJWT: string | null = null;
let jwtExpiryTime: number = 0;

/**
 * Get a valid JWT token for CDP API calls
 * Automatically generates new token if expired
 */
export const getValidJWT = async (): Promise<string> => {
  const now = Date.now();
  
  // Check if we have a valid cached JWT
  if (cachedJWT && now < jwtExpiryTime) {
    return cachedJWT;
  }
  
  // Generate new JWT
  try {
    const generator = createCDPJWTGenerator();
    cachedJWT = generator.generateJWT();
    jwtExpiryTime = now + (110 * 1000); // Set expiry 10 seconds before actual expiry
    
    console.log(`🔐 Generated new JWT for CDP API (expires in ${generator.getJWTTimeRemaining(cachedJWT)}s)`);
    return cachedJWT;
  } catch (error) {
    console.error('❌ Failed to generate JWT for CDP API:', error);
    throw new Error('CDP API authentication failed');
  }
};

// Client-side API functions that call our server-side API routes
export const initializeCDP = async () => {
  // This is now handled server-side, so we just return true
  // The actual initialization happens in the API route
  return true;
};

// Event types based on the contract ABI
export interface PlayerJoinedEvent {
  player: string;
  entryFee: string;
  platformFee: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface ScoreSubmittedEvent {
  player: string;
  score: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

export interface PrizesDistributedEvent {
  sessionId: string;
  winners: string[];
  amounts: string[];
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface SessionStartedEvent {
  startTime: string;
  duration: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface SessionEndedEvent {
  endTime: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TrialPlayerJoinedEvent {
  sessionId: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TrialScoreSubmittedEvent {
  sessionId: string;
  score: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

// Client-side API functions that call our server-side API routes
const fetchFromAPI = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
};

// Generic event fetcher
export const fetchContractEvents = async (
  eventName: string,
  fromBlock?: number,
  toBlock?: number
) => {
  const params = new URLSearchParams({ type: eventName });
  if (fromBlock !== undefined) params.append('fromBlock', fromBlock.toString());
  if (toBlock !== undefined) params.append('toBlock', toBlock.toString());
  
  const response = await fetchFromAPI(`/api/cdp-events?${params}`);
  return response.events;
};

// Specific event fetchers
export const fetchPlayerJoinedEvents = async (fromBlock?: number, toBlock?: number): Promise<PlayerJoinedEvent[]> => {
  const events = await fetchContractEvents("PlayerJoined", fromBlock, toBlock);
  return events.map((event: any) => ({
    player: event.data.player,
    entryFee: event.data.entryFee,
    platformFee: event.data.platformFee,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: event.timestamp
  }));
};

export const fetchScoreSubmittedEvents = async (fromBlock?: number, toBlock?: number): Promise<ScoreSubmittedEvent[]> => {
  const events = await fetchContractEvents("ScoreSubmitted", fromBlock, toBlock);
  return events.map((event: any) => ({
    player: event.data.player,
    score: event.data.score,
    timestamp: event.data.timestamp,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash
  }));
};

export const fetchPrizesDistributedEvents = async (fromBlock?: number, toBlock?: number): Promise<PrizesDistributedEvent[]> => {
  const events = await fetchContractEvents("PrizesDistributed", fromBlock, toBlock);
  return events.map((event: any) => ({
    sessionId: event.data.sessionId,
    winners: event.data.winners,
    amounts: event.data.amounts,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: event.timestamp
  }));
};

export const fetchSessionStartedEvents = async (fromBlock?: number, toBlock?: number): Promise<SessionStartedEvent[]> => {
  const events = await fetchContractEvents("SessionStarted", fromBlock, toBlock);
  return events.map((event: any) => ({
    startTime: event.data.startTime,
    duration: event.data.duration,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: event.timestamp
  }));
};

export const fetchSessionEndedEvents = async (fromBlock?: number, toBlock?: number): Promise<SessionEndedEvent[]> => {
  const events = await fetchContractEvents("SessionEnded", fromBlock, toBlock);
  return events.map((event: any) => ({
    endTime: event.data.endTime,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: event.timestamp
  }));
};

export const fetchTrialPlayerJoinedEvents = async (fromBlock?: number, toBlock?: number): Promise<TrialPlayerJoinedEvent[]> => {
  const events = await fetchContractEvents("TrialPlayerJoined", fromBlock, toBlock);
  return events.map((event: any) => ({
    sessionId: event.data.sessionId,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: event.timestamp
  }));
};

export const fetchTrialScoreSubmittedEvents = async (fromBlock?: number, toBlock?: number): Promise<TrialScoreSubmittedEvent[]> => {
  const events = await fetchContractEvents("TrialScoreSubmitted", fromBlock, toBlock);
  return events.map((event: any) => ({
    sessionId: event.data.sessionId,
    score: event.data.score,
    timestamp: event.data.timestamp,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash
  }));
};

// Get recent events (last 100 blocks)
export const getRecentEvents = async () => {
  try {
    const response = await fetchFromAPI('/api/cdp-events');
    return response.events;
  } catch (error) {
    console.error("Error fetching recent events:", error);
    throw error;
  }
};
