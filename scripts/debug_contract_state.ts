import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '../lib/blockchain/contracts';

const KEYSTONE_FORWARDER = '0xF8344CFd5c43616a4366C34E3EEE75af79a74482';

const RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  'https://mainnet.base.org';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

type CreSkipReason =
  | 'none_ready_to_distribute'
  | 'no_session_started'
  | 'session_still_active'
  | 'prizes_already_distributed'
  | 'empty_prize_pool'
  | 'no_on_chain_scores';

const evaluateCreSkip = (params: {
  sessionCounter: bigint;
  isSessionActive: boolean;
  prizePool: bigint;
  endTime: bigint;
  hasOnChainScores: boolean;
  now: bigint;
}): CreSkipReason => {
  const { sessionCounter, isSessionActive, prizePool, endTime, hasOnChainScores, now } = params;
  const isSessionEnded = !isSessionActive || now > endTime;
  const prizesDistributedHeuristic =
    sessionCounter > BigInt(0) && !isSessionActive && prizePool === BigInt(0);

  if (sessionCounter === BigInt(0)) return 'no_session_started';
  if (!isSessionEnded) return 'session_still_active';
  if (prizesDistributedHeuristic) return 'prizes_already_distributed';
  if (prizePool === BigInt(0)) return 'empty_prize_pool';
  if (!hasOnChainScores) return 'no_on_chain_scores';
  return 'none_ready_to_distribute';
};

const formatTimestamp = (ts: bigint): string => {
  if (ts === BigInt(0)) return 'never';
  return new Date(Number(ts) * 1000).toISOString();
};

async function main() {
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;
  console.log('BEATME weekly payout diagnostics');
  console.log('Contract:', contract);
  console.log('RPC:', RPC_URL);
  console.log('');

  const code = await publicClient.getBytecode({ address: contract });
  if (!code || code === '0x') {
    console.error('No contract bytecode at address');
    process.exit(1);
  }

  const [
    isSessionActive,
    sessionCounter,
    entryFee,
    lastSessionTime,
    sessionInterval,
    prizePool,
    players,
    chainlinkOracle,
  ] = await Promise.all([
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'isSessionActive' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'sessionCounter' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'entryFee' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'lastSessionTime' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'sessionInterval' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'currentSessionPrizePool' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'getCurrentPlayers' }),
    publicClient.readContract({ address: contract, abi: TRIVIA_ABI, functionName: 'chainlinkOracle' }),
  ]);

  const endTime = (lastSessionTime as bigint) + (sessionInterval as bigint);
  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log('--- Session ---');
  console.log('sessionCounter:', sessionCounter.toString());
  console.log('isSessionActive:', isSessionActive);
  console.log('entryFee:', formatUnits(entryFee as bigint, 6), 'USDC');
  console.log('lastSessionTime:', formatTimestamp(lastSessionTime as bigint));
  console.log('sessionInterval:', (sessionInterval as bigint).toString(), 'seconds');
  console.log('sessionEndTime:', formatTimestamp(endTime));
  console.log('currentSessionPrizePool:', formatUnits(prizePool as bigint, 6), 'USDC');
  console.log('');

  console.log('--- CRE wiring ---');
  const oracle = (chainlinkOracle as string).toLowerCase();
  const expected = KEYSTONE_FORWARDER.toLowerCase();
  console.log('chainlinkOracle:', chainlinkOracle);
  console.log(
    oracle === expected ? 'OK: matches Keystone forwarder' : 'WARN: oracle mismatch — CRE onReport may revert',
  );
  console.log('');

  console.log('--- Players & scores ---');
  const playerList = players as `0x${string}`[];
  if (playerList.length === 0) {
    console.log('No players registered in current session');
  } else {
    let hasOnChainScores = false;
    for (const player of playerList) {
      const score = await publicClient.readContract({
        address: contract,
        abi: TRIVIA_ABI,
        functionName: 'getPlayerScore',
        args: [player],
      });
      if ((score as bigint) > BigInt(0)) hasOnChainScores = true;
      console.log(`  ${player} score=${score.toString()}`);
    }

    const skipReason = evaluateCreSkip({
      sessionCounter: sessionCounter as bigint,
      isSessionActive: isSessionActive as boolean,
      prizePool: prizePool as bigint,
      endTime,
      hasOnChainScores,
      now,
    });

    console.log('');
    console.log('--- CRE weekly-prize-dist-prod prediction ---');
    if (skipReason === 'none_ready_to_distribute') {
      console.log('Would EXECUTE distributePrizes() on next Sunday cron (or manual owner call now)');
    } else {
      console.log(`Would SKIP distribution: ${skipReason}`);
      if (skipReason === 'no_on_chain_scores') {
        console.log('Fix: POST /api/submit-onchain-scores then distributePrizes()');
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
