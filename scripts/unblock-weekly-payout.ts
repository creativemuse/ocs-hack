#!/usr/bin/env npx tsx
/**
 * Unblock a stuck weekly payout: sync Spacetime scores on-chain, then distribute prizes.
 *
 * Requires:
 *   CONTRACT_OWNER_PRIVATE_KEY (or PRIVATE_KEY)
 *   BASE_RPC_URL (optional; avoids Alchemy if origin-blocked)
 *
 * Optional:
 *   ADMIN_API_SECRET + --remote  → call production /api/submit-onchain-scores instead of local sync
 *   --score=0xWallet:12345       → override score for a player
 */
import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '../lib/blockchain/contracts';
import { resolveBaseRpcUrl } from '../lib/blockchain/baseRpc';
import { submitScoresOnChain } from '../lib/blockchain/submitScoresOnChain';
import {
  getWeeklyScoresForPlayers,
  hasResolvableWeeklyScores,
} from '../lib/game/weeklyScoresForPlayers';

const APP_URL = process.env.APP_URL || 'https://beatme.creativeplatform.xyz';
const RPC = resolveBaseRpcUrl();

const getOwnerKey = (): string => {
  const key = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!key) {
    throw new Error('CONTRACT_OWNER_PRIVATE_KEY or PRIVATE_KEY is required');
  }
  return key.startsWith('0x') ? key : `0x${key}`;
};

const parseScoreOverrides = (): Map<string, bigint> => {
  const overrides = new Map<string, bigint>();
  for (const arg of process.argv) {
    if (!arg.startsWith('--score=')) continue;
    const payload = arg.slice('--score='.length);
    const [wallet, scoreText] = payload.split(':');
    if (!wallet || !scoreText) continue;
    overrides.set(wallet.toLowerCase(), BigInt(scoreText));
  }
  return overrides;
};

const createReadClient = () => createPublicClient({ chain: base, transport: http(RPC) });

async function syncScoresLocal(): Promise<void> {
  const scoreOverrides = parseScoreOverrides();
  const publicClient = createReadClient();
  const [sessionCounter, players] = await Promise.all([
    publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'sessionCounter',
    }),
    publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'getCurrentPlayers',
    }),
  ]);

  const playerList = players as `0x${string}`[];

  if (playerList.length === 0) {
    console.log('No on-chain players to sync');
    return;
  }

  const { scores: resolved } = await getWeeklyScoresForPlayers(playerList, {
    sessionCounter: Number(sessionCounter),
    skipSpacetime:
      scoreOverrides.size > 0 &&
      playerList.every((address) => scoreOverrides.has(address.toLowerCase())),
  });
  const addresses: `0x${string}`[] = [];
  const scores: bigint[] = [];

  for (const entry of resolved) {
    const override = scoreOverrides.get(entry.address.toLowerCase());
    const score = override ?? entry.score;
    addresses.push(entry.address);
    scores.push(score);
    console.log(
      `  ${entry.address} score=${score.toString()}${override !== undefined ? ' (override)' : ''}`,
    );
  }

  if (!hasResolvableWeeklyScores(resolved) && scoreOverrides.size === 0) {
    throw new Error(
      `No Spacetime scores for session ${sessionCounter}. Use --score=0xWallet:12345 or save scores in SpacetimeDB first.`,
    );
  }

  const txHash = await submitScoresOnChain(addresses, scores);
  if (!txHash) {
    throw new Error('submitScoresOnChain returned null (session inactive or missing owner key)');
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  if (receipt.status !== 'success') {
    throw new Error(`submitScores failed: ${txHash}`);
  }
  console.log('submitScores tx:', txHash);
}

async function syncScoresRemote(): Promise<void> {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    throw new Error('ADMIN_API_SECRET is required for --remote score sync');
  }

  const res = await fetch(`${APP_URL}/api/submit-onchain-scores`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminSecret}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  console.log('Score sync response:', res.status, body);

  if (!res.ok) {
    throw new Error(`Score sync failed: ${res.status} ${JSON.stringify(body)}`);
  }
}

async function syncScores(useRemote: boolean): Promise<void> {
  if (useRemote) {
    try {
      await syncScoresRemote();
      return;
    } catch (error) {
      console.warn('Remote score sync failed; falling back to local owner tx...');
      console.warn(error instanceof Error ? error.message : error);
    }
  }
  await syncScoresLocal();
}

async function distributePrizes(): Promise<`0x${string}`> {
  const account = privateKeyToAccount(getOwnerKey() as `0x${string}`);
  const publicClient = createReadClient();
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC),
  });

  const hash = await walletClient.writeContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'distributePrizes',
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`distributePrizes reverted: ${hash}`);
  }

  return hash;
}

async function printState(label: string): Promise<void> {
  const publicClient = createReadClient();
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  const [counter, active, players] = await Promise.all([
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'sessionCounter' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'isSessionActive' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'getCurrentPlayers' }),
  ]);

  const sessionInfo = await publicClient.readContract({
    address: contract,
    abi: TRIVIA_ABI,
    functionName: 'getSessionInfo',
    args: [counter],
  }) as readonly [boolean, boolean, bigint, bigint, bigint, bigint];
  const pool = sessionInfo[4];

  console.log(`\n--- ${label} ---`);
  console.log('sessionCounter:', counter.toString());
  console.log('isSessionActive:', active);
  console.log('prizePool:', formatUnits(pool, 6), 'USDC');
  for (const player of players as `0x${string}`[]) {
    const score = await publicClient.readContract({
      address: contract,
      abi: TRIVIA_ABI,
      functionName: 'getPlayerScore',
      args: [player],
    });
    console.log(`  ${player} score=${score.toString()}`);
  }
}

async function main() {
  const skipSync = process.argv.includes('--skip-sync');
  const skipDistribute = process.argv.includes('--skip-distribute');
  const useRemote = process.argv.includes('--remote');

  console.log('Unblock weekly payout');
  console.log('Contract:', TRIVIA_CONTRACT_ADDRESS);
  console.log('RPC:', RPC);
  console.log('App:', APP_URL);
  console.log(
    'Score sync mode:',
    useRemote ? 'remote API (with local fallback)' : 'local (SpacetimeDB + owner tx)',
  );

  await printState('Before');

  if (!skipSync) {
    console.log('\nStep 1: Syncing scores...');
    await syncScores(useRemote);
  }

  if (!skipDistribute) {
    console.log('\nStep 2: Calling distributePrizes() as owner...');
    const tx = await distributePrizes();
    console.log('distributePrizes tx:', tx);
  }

  await printState('After');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
