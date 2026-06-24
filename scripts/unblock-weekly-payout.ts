#!/usr/bin/env npx tsx
/**
 * Unblock a stuck weekly payout: sync Spacetime scores on-chain, then distribute prizes.
 *
 * Requires:
 *   ADMIN_API_SECRET
 *   CONTRACT_OWNER_PRIVATE_KEY (or PRIVATE_KEY)
 *   BASE_RPC_URL (optional)
 *   APP_URL (optional, default production)
 */
import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '../lib/blockchain/contracts';
import { spacetimeClient } from '../lib/apis/spacetime';
import { submitScoresOnChain } from '../lib/blockchain/submitScoresOnChain';

const APP_URL = process.env.APP_URL || 'https://beatme.creativeplatform.xyz';
const RPC = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

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

async function syncScoresLocal(): Promise<void> {
  const scoreOverrides = parseScoreOverrides();
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
  const players = (await publicClient.readContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getCurrentPlayers',
  })) as `0x${string}`[];

  if (players.length === 0) {
    console.log('No on-chain players to sync');
    return;
  }

  await spacetimeClient.ensurePlayerDataReady();

  const addresses: `0x${string}`[] = [];
  const scores: bigint[] = [];

  for (const addr of players) {
    const override = scoreOverrides.get(addr.toLowerCase());
    const profile = spacetimeClient.getPlayerProfile(addr);
    const score =
      override ??
      (profile
        ? BigInt(profile.weeklyBestScore > 0 ? profile.weeklyBestScore : profile.bestScore)
        : BigInt(0));
    addresses.push(addr);
    scores.push(score);
    console.log(`  ${addr} score=${score.toString()}${override !== undefined ? ' (override)' : ''}`);
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

async function syncScores(): Promise<void> {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    throw new Error('ADMIN_API_SECRET is required for score sync');
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

async function distributePrizes(): Promise<`0x${string}`> {
  const account = privateKeyToAccount(getOwnerKey() as `0x${string}`);
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
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
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  const [pool, active, counter, players] = await Promise.all([
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'currentSessionPrizePool' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'isSessionActive' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'sessionCounter' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'getCurrentPlayers' }),
  ]);

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
  const useLocalSync = process.argv.includes('--local') || !process.env.ADMIN_API_SECRET;

  console.log('Unblock weekly payout');
  console.log('Contract:', TRIVIA_CONTRACT_ADDRESS);
  console.log('App:', APP_URL);
  console.log('Score sync mode:', useLocalSync ? 'local (SpacetimeDB + owner tx)' : 'remote API');

  await printState('Before');

  if (!skipSync) {
    console.log('\nStep 1: Syncing scores...');
    if (useLocalSync) {
      await syncScoresLocal();
    } else {
      await syncScores();
    }
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
