import { fetchWeeklyPayoutDiagnostics } from '../lib/game/weeklyPayoutDiagnostics';

const RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  'https://mainnet.base.org';

async function main() {
  console.log('BEATME weekly payout diagnostics');
  console.log('RPC:', RPC_URL);
  console.log('');

  const diagnostics = await fetchWeeklyPayoutDiagnostics();

  console.log('Contract:', diagnostics.contract);
  console.log('');
  console.log('--- Session ---');
  console.log('sessionCounter:', diagnostics.sessionCounter);
  console.log('isSessionActive:', diagnostics.isSessionActive);
  console.log('entryFee:', diagnostics.entryFeeUsdc, 'USDC');
  console.log('lastSessionTime:', diagnostics.lastSessionTime);
  console.log('sessionInterval:', diagnostics.sessionIntervalSeconds, 'seconds');
  console.log('sessionEndTime:', diagnostics.sessionEndTime);
  console.log('currentSessionPrizePool:', diagnostics.prizePoolUsdc, 'USDC');
  console.log('');
  console.log('--- CRE wiring ---');
  console.log('chainlinkOracle:', diagnostics.chainlinkOracle);
  console.log(
    diagnostics.oracleMatchesKeystone
      ? 'OK: matches Keystone forwarder'
      : 'WARN: oracle mismatch — CRE onReport may revert',
  );
  console.log('');
  console.log('--- Players & scores ---');
  if (diagnostics.players.length === 0) {
    console.log('No players registered in current session');
  } else {
    for (const player of diagnostics.players) {
      console.log(`  ${player.address} score=${player.score}`);
    }
  }

  console.log('');
  console.log('--- CRE weekly-prize-dist-prod prediction ---');
  if (diagnostics.creWouldExecute) {
    console.log('Would EXECUTE distributePrizes() on next Sunday cron (or manual owner call now)');
  } else {
    console.log(`Would SKIP distribution: ${diagnostics.creSkipReason}`);
    if (diagnostics.creSkipReason === 'no_on_chain_scores') {
      console.log('Fix: POST /api/submit-onchain-scores then distributePrizes()');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
