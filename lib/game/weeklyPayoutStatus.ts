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
  countdownExpired: boolean;
  hasOnChainScores: boolean;
  sessionCounter: number;
};

export const getWeeklyPayoutStatus = ({
  isLoading,
  isSessionActive,
  sessionPrizePool,
  countdownExpired,
  hasOnChainScores,
  sessionCounter,
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

  if (!isSessionActive && sessionPrizePool > 0) {
    return {
      phase: 'payout_pending',
      timerLabel: 'WEEKLY PAYOUT PENDING',
      weekSubtitle,
    };
  }

  if (isSessionActive && countdownExpired) {
    if (sessionPrizePool > 0 && !hasOnChainScores) {
      return {
        phase: 'awaiting_score_sync',
        timerLabel: 'AWAITING SCORE SYNC',
        weekSubtitle,
      };
    }

    return {
      phase: 'payout_pending',
      timerLabel: 'PAYOUT PROCESSING',
      weekSubtitle,
    };
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
