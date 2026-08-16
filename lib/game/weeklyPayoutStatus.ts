export type WeeklyPayoutPhase =
  | 'loading'
  | 'counting_down'
  | 'awaiting_score_sync'
  | 'payout_pending'
  | 'session_complete'
  | 'next_session_soon';

export type WeeklyPayoutStatus = {
  phase: WeeklyPayoutPhase;
  timerLabel: string;
  weekSubtitle: string;
};

type WeeklyPayoutStatusInput = {
  isLoading: boolean;
  isSessionActive: boolean;
  sessionPrizePool: number;
  distributed?: boolean;
  countdownExpired: boolean;
  hasOnChainScores: boolean;
  sessionCounter: number;
  creSkipReason?: string | null;
  /** Optional current time (epoch seconds) for deterministic next-run calc. Defaults to now. */
  now?: number;
};

/** Next Sunday 00:00 UTC strictly after the given epoch-seconds time. */
function nextSundayUtcMidnight(epochSeconds: number): Date {
  const d = new Date(epochSeconds * 1000)
  // getUTCDay(): 0=Sun, 1=Mon, ... 6=Sat. Days until next Sunday (strictly ahead).
  const dayOfWeek = d.getUTCDay()
  const daysUntilSunday = (7 - dayOfWeek) % 7
  // If it's already Sunday, schedule next week; otherwise daysUntilSunday is 0..6.
  const addDays = daysUntilSunday === 0 ? 7 : daysUntilSunday
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + addDays, 0, 0, 0, 0),
  )
}

function formatNextRun(epochSeconds: number): string {
  const next = nextSundayUtcMidnight(epochSeconds)
  return next.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }) + ' 00:00 UTC'
}

export const getWeeklyPayoutStatus = ({
  isLoading,
  isSessionActive,
  sessionPrizePool,
  distributed,
  countdownExpired,
  hasOnChainScores,
  sessionCounter,
  creSkipReason,
  now = Math.floor(Date.now() / 1000),
}: WeeklyPayoutStatusInput): WeeklyPayoutStatus => {
  if (isLoading) {
    return {
      phase: 'loading',
      timerLabel: 'Loading...',
      weekSubtitle: '',
    };
  }

  const weekSubtitle =
    sessionCounter > 0
      ? `Week ${sessionCounter} — new week starts when the next player joins`
      : '';

  if (!isSessionActive && sessionPrizePool <= 0) {
    return {
      phase: 'next_session_soon',
      timerLabel: 'NEXT SESSION OPENS SOON',
      weekSubtitle,
    };
  }

  if (distributed) {
    return {
      phase: 'session_complete',
      timerLabel: 'WEEK COMPLETE',
      weekSubtitle,
    };
  }

  if (!isSessionActive && sessionPrizePool > 0) {
    return {
      phase: 'payout_pending',
      timerLabel: 'WEEKLY PAYOUT PENDING',
      weekSubtitle,
    };
  }

  if (isSessionActive && countdownExpired) {
    if (sessionPrizePool > 0 && !hasOnChainScores) {
      // Session ended with a prize pool but scores haven't been synced on-chain
      // yet. The Chainlink CRE weekly-distribution workflow runs Sundays at
      // 00:00 UTC and syncs scores then distributes, so a session that ends
      // mid-week waits until the next Sunday run. Communicate the cadence
      // rather than implying a stuck/technical state.
      const nextRunNote = creSkipReason
        ? `${weekSubtitle} CRE: ${creSkipReason}`.trim()
        : `${weekSubtitle} Weekly payout processes ${formatNextRun(now)}`.trim()
      return {
        phase: 'awaiting_score_sync',
        timerLabel: 'PAYOUT PENDING',
        weekSubtitle: nextRunNote,
      }
    }

    return {
      phase: 'payout_pending',
      timerLabel: 'PAYOUT PROCESSING',
      weekSubtitle,
    }
  }

  if (isSessionActive) {
    return {
      phase: 'counting_down',
      timerLabel: '',
      weekSubtitle,
    };
  }

  return {
    phase: 'session_complete',
    timerLabel: 'WEEK COMPLETE',
    weekSubtitle,
  };
};
