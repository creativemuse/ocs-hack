'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ASSETS } from '@/lib/config/assets';
import { useGameSession } from '@/hooks/useGameSession';
import { formatTimeRemainingText } from '@/lib/utils/timeUtils';
import GameEntry from '@/components/game/GameEntry';
import MultiplayerLobby from '@/components/game/MultiplayerLobby';
import GuestModeEntry from '@/components/game/GuestModeEntry';
// GamePayment view removed — no longer needed in the flow
import AudioPlayer from '@/components/game/AudioPlayer';
import ActivePlayers from '@/components/game/ActivePlayers';
import type { TriviaQuestion, PlayerModeChoice, GameStartOptions } from '@/types/game';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useContractUSDCBalance } from '@/hooks/useContractUSDCBalance';
import GameTitle from '@/components/ui/GameTitle';
import HighScoreDisplay from '@/components/game/HighScoreDisplay';
import TopEarners from '@/components/leaderboard/TopEarners';
// OnchainKit imports removed - using Base Account instead
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isLobbySessionStatus } from '@/lib/utils/gameSessionStatus';
import { ENTRY_FEE_USDC } from '@/lib/blockchain/contracts';

function HomePage() {
  const {
    session,
    timeRemaining,
    lobbyTimeRemaining,
    canJoin,
    isLoading,
    waitingForPaidPlayer,
    playerId,
    entryToken,
    joinGame,
    leaveGame,
    endLobby,
    syncLobbyDuration,
    refetch,
    error: gameSessionError,
  } = useGameSession();
  const [showGameEntry, setShowGameEntry] = useState(false);
  const [showGuestMode, setShowGuestMode] = useState(false);
  const [playerModeChoice, setPlayerModeChoice] = useState<PlayerModeChoice>('trial');
  const [gameStarted, setGameStarted] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isTrialGame, setIsTrialGame] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [inMultiplayerLobby, setInMultiplayerLobby] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const searchParams = useSearchParams();

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [gameTimeRemaining, setGameTimeRemaining] = useState(10);
  const [currentRound, setCurrentRound] = useState(1);
  const totalRounds = 3;
  const questionsPerRound = 10;
  const [questionNumberInRound, setQuestionNumberInRound] = useState(1);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [completedAsTrial, setCompletedAsTrial] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCorrectAnswer, setVerifiedCorrectAnswer] = useState<number | null>(null);
  const timerTriggeredRef = useRef(false);
  const lastGameWasPaidRef = useRef(false);
  const paidScoreSavedRef = useRef(false);
  // Add trial status hook
  const { address } = useBaseAccount();
  const [joinGameStartError, setJoinGameStartError] = useState<string | null>(null);
  const { trialStatus, incrementTrialGame } = useTrialStatus(address as string, entryToken ?? undefined);
  
  // Add contract USDC balance hook
  const {
    balance: contractUSDCBalance,
    isLoading: contractBalanceLoading,
    error: contractBalanceError,
    refreshBalance: refreshContractUsdcBalance,
    entryFee: contractEntryFee,
    sessionPrizePool,
    playerCount: onChainPlayerCount,
    isSessionActive: onChainSessionActive,
    lastSessionTime: onChainLastSessionTime,
    sessionInterval: onChainSessionInterval,
  } = useContractUSDCBalance();

  // Automatically switch to paid solo if trial is exhausted
  useEffect(() => {
    if (trialStatus.gamesRemaining === 0 && !trialStatus.isTrialActive && playerModeChoice === 'trial') {
      console.log('Trial exhausted - automatically switching to paid solo');
      setPlayerModeChoice('paid_solo');
    }
  }, [trialStatus.gamesRemaining, trialStatus.isTrialActive, playerModeChoice]);

  // Refetch session when time remaining hits 0 so canJoin updates promptly
  useEffect(() => {
    if (timeRemaining === 0 && !canJoin) {
      refetch();
    }
  }, [timeRemaining, canJoin, refetch]);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/?mode=multiplayer`);
  }, []);

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'multiplayer') {
      setPlayerModeChoice('paid_multiplayer');
    }
  }, [searchParams]);

  // Persist paid run to Spacetime (TOP EARNERS / bestScore). Trial scores never call this.
  useEffect(() => {
    if (!gameCompleted || !lastGameWasPaidRef.current || !address) return;
    if (paidScoreSavedRef.current) return;
    paidScoreSavedRef.current = true;
    const finalScore = totalScore;
    const wallet = address;
    void (async () => {
      try {
        const res = await fetch('/api/save-paid-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: wallet,
            finalScore,
            entryToken: entryToken ?? undefined,
          }),
        });
        if (!res.ok) {
          paidScoreSavedRef.current = false;
          console.error('save-paid-score failed', await res.text());
          return;
        }
        refreshContractUsdcBalance();
      } catch (e) {
        paidScoreSavedRef.current = false;
        console.error('save-paid-score error', e);
      }
    })();
  }, [gameCompleted, address, totalScore, refreshContractUsdcBalance]);

  const loadRandomQuestion = useCallback(async () => {
    setGameLoading(true);
    setGameError(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsVerifying(false);
    setVerifiedCorrectAnswer(null);
    setStartTime(Date.now());
    setGameTimeRemaining(10);
    setAudioError(false);
    timerTriggeredRef.current = false;

    try {
      const params = new URLSearchParams({
        folder: 'Global_Top_100',
        mode: 'name-that-tune',
        count: '1',
        difficulty: 'medium',
        choices: '4',
      });

      const endpoints = [
        '/api/lighthouse-questions',
        '/api/spacetime-questions'
      ];
      let lastError: Error | null = null;
      let data: { questions: TriviaQuestion[] } | null = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${endpoint}?${params.toString()}`, { cache: 'no-store' });
          const contentType = res.headers.get('content-type') || '';
          if (!res.ok) {
            const message = contentType.includes('application/json')
              ? (await res.json()).error || res.statusText
              : await res.text();
            throw new Error(message || 'Failed to load question');
          }
          if (!contentType.includes('application/json')) {
            throw new Error('Invalid response format from questions API');
          }
          const parsed = await res.json();
          data = parsed;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Failed to load question');
        }
      }

      if (!data) {
        throw lastError || new Error('Failed to load question');
      }

      if (!data.questions?.length) {
        throw new Error('No questions available');
      }

      const question = data.questions[0]!;
      setCurrentQuestion(question);
      setStartTime(Date.now());
    } catch (e) {
      console.error('❌ Error loading question:', e);
      setGameError(e instanceof Error ? e.message : 'Failed to load question');
    } finally {
      setGameLoading(false);
    }
  }, []);

  const handleJoinGame = async () => {
    setJoinGameStartError(null);
    setShowGameEntry(true);
  };

  const handleGuestStart = async (name: string) => {
    try {
      lastGameWasPaidRef.current = false;
      // Join the game session as a trial player
      await joinGame(false);
      setGuestName(name);
      setIsGuestMode(true);
      setIsTrialGame(true);
      setShowGuestMode(false);
      setShowGameEntry(false);
      setGameStarted(true);
      loadRandomQuestion();
    } catch (error) {
      console.error('Error joining game as guest:', error);
      // Handle error - could show a message to user
    }
  };

  const handleWalletConnect = () => {
    // Payment view removed — go straight to game entry with paid modes
    setShowGameEntry(true);
  };

  const handleGameStart = async ({
    isTrial,
    paidTxHash,
    playerMode,
    walletUniversalAddress,
  }: GameStartOptions) => {
    setJoinGameStartError(null);
    try {
      const data = await joinGame(!isTrial, paidTxHash, {
        playerMode,
        lobbyDurationSec: 180,
        walletUniversalAddress: walletUniversalAddress ?? undefined,
      });
      lastGameWasPaidRef.current = !isTrial;
      setIsTrialGame(isTrial);
      setCompletedAsTrial(false);
      setShowGameEntry(false);
      const sess = data?.session;
      if (playerMode === 'paid_multiplayer' && isLobbySessionStatus(sess)) {
        setInMultiplayerLobby(true);
        if (!isTrial) refreshContractUsdcBalance();
        return;
      }
      setInMultiplayerLobby(false);
      setGameStarted(true);
      if (!isTrial) refreshContractUsdcBalance();
      loadRandomQuestion();
    } catch (error) {
      console.error('Error joining game:', error);
      const message =
        error instanceof Error ? error.message : 'Could not join the game. Please try again.';
      setJoinGameStartError(message);
      setShowGameEntry(true);
    }
  };

  const handleBackToHome = async () => {
    try {
      // Leave the game session if we're in one
      if (session) {
        await leaveGame();
      }
    } catch (error) {
      console.error('Error leaving game session:', error);
    } finally {
      setJoinGameStartError(null);
      setShowGameEntry(false);
      setShowGuestMode(false);
      setGameStarted(false);
      setIsGuestMode(false);
      setGameCompleted(false);
      setCompletedAsTrial(false);
      paidScoreSavedRef.current = false;
      lastGameWasPaidRef.current = false;
      setScore(0);
      setTotalScore(0);
      setCurrentRound(1);
      setQuestionNumberInRound(1);
      refreshContractUsdcBalance();
    }
  };

  const handleAnswerSelect = async (answerIndex: number) => {
    if (isAnswered || !currentQuestion || gameTimeRemaining <= 0) return;

    // Optimistically highlight the selected answer immediately
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionToken: currentQuestion.questionToken,
          selectedAnswer: answerIndex,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVerifiedCorrectAnswer(data.correctAnswer);
        if (data.isCorrect && data.pointsEarned > 0) {
          setScore(prev => prev + data.pointsEarned);
          setTotalScore(prev => prev + data.pointsEarned);
        }
      } else {
        // Verification failed (expired token, etc.) — treat as incorrect, no points
        console.warn('Answer verification failed:', res.status);
      }
    } catch (error) {
      console.error('Answer verification error:', error);
      // Network error — treat as incorrect, no points
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNextQuestion = async () => {
    if (questionNumberInRound >= questionsPerRound) {
      if (currentRound < totalRounds) {
        setCurrentRound(prev => prev + 1);
        setQuestionNumberInRound(1);
        setScore(0);
      } else {
        // Game completed - update trial status if this was a trial game
        if (isTrialGame) {
          setCompletedAsTrial(true);
          try {
            await incrementTrialGame();
            setIsTrialGame(false);
          } catch (error) {
            console.error('Error updating trial status:', error);
          }
        }
        setGameCompleted(true);
        return;
      }
    } else {
      setQuestionNumberInRound(prev => prev + 1);
    }

    loadRandomQuestion();
  };

  const handleAudioTimeUpdate = useCallback((currentTime: number, duration: number) => {
    // Calculate remaining time based on audio progress, but cap at 10 seconds
    const audioRemaining = Math.max(0, duration - currentTime);
    const maxTime = 10; // 10 second limit
    const remaining = Math.min(audioRemaining, maxTime);
    
    // Round to nearest 0.1 seconds for smoother display
    const roundedRemaining = Math.round(remaining * 10) / 10;
    
    // Only update if the remaining time has actually changed (to prevent unnecessary re-renders)
    setGameTimeRemaining(prev => {
      if (Math.abs(prev - roundedRemaining) >= 0.1) {
        return roundedRemaining;
      }
      return prev;
    });
  }, [currentQuestion]);

  // Add a safety timer that only triggers if audio doesn't update properly
  useEffect(() => {
    if (!currentQuestion || isAnswered) return;
    
    // Safety timer - only trigger if audio hasn't updated for too long
    const safetyTimer = setTimeout(() => {
      setGameTimeRemaining(prev => {
        // Only force to 0 if we're still at the initial value (audio didn't update)
        if (prev === 10) {
          return 0;
        }
        return prev;
      });
    }, 11000); // 11 seconds - gives audio time to update

    return () => clearTimeout(safetyTimer);
  }, [currentQuestion, isAnswered]);

  const handleAudioError = () => {
    setAudioError(true);
    setTimeout(() => {
      loadRandomQuestion();
    }, 1000);
  };

  // Timer effect - removed automatic answer selection
  useEffect(() => {
    if (isAnswered || gameLoading || !currentQuestion) return;

    // Only update timer display, don't auto-select answer
    if (gameTimeRemaining <= 0 && !timerTriggeredRef.current) {
      timerTriggeredRef.current = true;
      // Don't automatically answer - let user choose or time out naturally
    }
  }, [gameTimeRemaining, isAnswered, gameLoading, currentQuestion]);

  // Cleanup effect - leave game session when component unmounts
  useEffect(() => {
    return () => {
      // Only leave the game session if we actually joined it (have a playerId)
      if (session && playerId) {
        leaveGame().catch(error => {
          console.error('Error leaving game session on unmount:', error);
        });
      }
    };
  }, [session, playerId, leaveGame]);

  // Determine what to display in the timer area
  const getTimerDisplay = () => {
    if (isLoading) return 'Loading...';
    
    if (waitingForPaidPlayer) {
      return 'WAITING FOR PAID PLAYER';
    }
    
    return formatTimeRemainingText(timeRemaining);
  };

  // Determine what to display in the player count area
  const getPlayerCountDisplay = () => {
    if (!session) return 'WAITING FOR PLAYERS';
    
    if (waitingForPaidPlayer) {
      return `${session.player_count || 0} PLAYERS PLAYING`;
    }
    
    const totalPlayers = session.player_count || 0;
    const paidPlayers = session.paid_player_count || 0;
    const trialPlayers = session.trial_player_count || 0;
    
    if (totalPlayers === 0) {
      return 'WAITING FOR PLAYERS';
    }
    
    if (paidPlayers === 0) {
      return `${trialPlayers} TRIAL PLAYERS WAITING`;
    }
    
    return `${totalPlayers} PLAYERS ARE PLAYING`;
  };

  // Show guest mode entry
  if (showGuestMode) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px]">
          <GuestModeEntry 
            onGuestStart={handleGuestStart}
            onWalletConnect={handleWalletConnect}
          />
        </div>
      </div>
    );
  }

  // When trial is exhausted, automatically show game entry with paid modes
  // (Trial Games Complete screen has been removed — users go straight to game entry)
  useEffect(() => {
    if (trialStatus.requiresWallet && !gameCompleted && !gameStarted && !showGameEntry && !showGuestMode && !inMultiplayerLobby) {
      setShowGameEntry(true);
    }
  }, [trialStatus.requiresWallet, gameCompleted, gameStarted, showGameEntry, showGuestMode, inMultiplayerLobby]);

  // Paid multiplayer lobby (memory session)
  if (inMultiplayerLobby) {
    return (
      <MultiplayerLobby
        session={session}
        lobbyTimeRemaining={lobbyTimeRemaining}
        inviteUrl={inviteUrl}
        sessionError={gameSessionError}
        onRoundStart={() => {
          setInMultiplayerLobby(false);
          // Reset game state to prevent stale values from previous game
          setGameCompleted(false);
          setCompletedAsTrial(false);
          setTotalScore(0);
          setScore(0);
          setCurrentRound(1);
          setQuestionNumberInRound(1);
          paidScoreSavedRef.current = false;
          // Start gameplay
          setGameStarted(true);
          loadRandomQuestion();
        }}
        onEndLobbyEarly={endLobby}
        onSyncDuration={syncLobbyDuration}
        refetch={refetch}
        onLeaveLobby={async () => {
          await leaveGame();
          setInMultiplayerLobby(false);
          setShowGameEntry(true);
        }}
      />
    );
  }

  // Show game entry screen with player mode choice
  if (showGameEntry) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px] space-y-4">
          {/* Player mode: Trial | Solo (paid) | Multiplayer (paid) */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white mb-2">Choose Your Play Mode</h2>
                <p className="text-gray-300 text-sm">Trial is free; paid modes use one USDC entry per session</p>
              </div>

              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-6"
                role="group"
                aria-label="Play mode"
              >
                {trialStatus.gamesRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setPlayerModeChoice('trial')}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                      playerModeChoice === 'trial'
                        ? 'border-green-500/60 bg-green-500/10 text-white'
                        : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    <span className="font-medium text-white">Trial</span>
                    <span className="mt-1 block text-xs text-gray-400">1 free play</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPlayerModeChoice('paid_solo')}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                    playerModeChoice === 'paid_solo'
                      ? 'border-amber-500/60 bg-amber-500/10 text-white'
                      : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <span className="font-medium text-white">Solo</span>
                  <span className="mt-1 block text-xs text-gray-400">Paid — prize pool</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerModeChoice('paid_multiplayer')}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                    playerModeChoice === 'paid_multiplayer'
                      ? 'border-amber-500/60 bg-amber-500/10 text-white'
                      : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <span className="font-medium text-white">Multiplayer</span>
                  <span className="mt-1 block text-xs text-gray-400">Paid — shared pool</span>
                </button>
              </div>

              <div className="text-center">
                {playerModeChoice === 'trial' ? (
                  <div className="text-green-400 text-sm">
                    <p className="font-medium">Free trial</p>
                    <p className="text-xs text-gray-300 mt-1">One free game, then use a paid mode</p>
                  </div>
                ) : playerModeChoice === 'paid_solo' ? (
                  <div className="text-amber-200/90 text-sm">
                    <p className="font-medium">Solo (paid)</p>
                    <p className="text-xs text-gray-300 mt-1">Connect wallet, approve USDC, and join the battle</p>
                  </div>
                ) : (
                  <div className="text-amber-200/90 text-sm">
                    <p className="font-medium">Multiplayer (paid)</p>
                    <p className="text-xs text-gray-300 mt-1">Same entry; pool grows with more players</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Entry Component */}
          <GameEntry
            onGameStart={handleGameStart}
            entryToken={entryToken}
            playerModeChoice={playerModeChoice}
            joinStartError={joinGameStartError}
            onDismissJoinStartError={() => setJoinGameStartError(null)}
            sessionBusy={!canJoin}
            sessionTimeRemaining={timeRemaining}
          />
          {/* Debug info */}
          {/* <div className="text-xs text-gray-500 text-center mt-2">
            Debug: playerModeChoice = {playerModeChoice}
          </div> */}
        </div>
      </div>
    );
  }

  // Show game interface
  if (gameStarted) {
    if (gameLoading) {
      return (
        <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center">
          <div className="text-white text-xl">Loading game...</div>
        </div>
      );
    }

    if (gameError) {
      return (
        <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-xl mb-4">Error loading game</div>
            <div className="text-gray-400 mb-4">{gameError}</div>
            <button
              onClick={handleBackToHome}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    if (gameCompleted) {
      return (
        <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
          <div className="w-full max-w-[390px] md:max-w-[428px] text-center">
            <div className="text-white mb-8">
              <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
              <div className="text-2xl mb-2">Final Score: {totalScore}</div>
              <div className="text-gray-400 mb-4">
                {completedAsTrial
                  ? isGuestMode
                    ? `Trial Player: ${guestName}`
                    : 'Trial Player'
                  : 'Paid Player'}
              </div>

              {/* Trial Player Notice */}
              {completedAsTrial && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                  <div className="text-amber-300 text-sm">
                    <p className="font-medium mb-2">🎮 Trial Game Results</p>
                    <p className="text-amber-200/80">
                      {`This was a practice game. Your score is not added to the paid leaderboard. Connect your wallet to play for real money and compete for prizes!`}
                    </p>
                  </div>
                </div>
              )}

              {/* Trial Exhausted Notice - directs user to home for paid modes */}
              {trialStatus.requiresWallet && completedAsTrial && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                  <div className="text-purple-300 text-sm">
                    <p className="font-medium mb-2">Want to keep playing?</p>
                    <p className="text-purple-200/80">
                      Head back to the home screen to connect your wallet and play for real prizes!
                    </p>
                  </div>
                </div>
              )}

              {/* High Score Display with Reward Claiming */}
              <div className="mb-6">
                <HighScoreDisplay
                  currentScore={totalScore}
                  playerName={isGuestMode ? guestName : 'Player'}
                  isGuest={isGuestMode}
                  isTrialGame={completedAsTrial}
                  walletAddress={!completedAsTrial && address ? address : undefined}
                  className="w-full"
                />
              </div>

              {/* Paid Player Success */}
              {!completedAsTrial && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <div className="text-green-300 text-sm">
                    <p className="font-medium mb-2">🏆 Prize Pool Entry</p>
                    <p className="text-green-200/80">
                      Your score is saved for the paid leaderboard and prize pool eligibility.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleBackToHome}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    // Main game interface
    return (
      <div className="bg-[#000000] min-h-screen w-full flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-[390px] md:max-w-[428px] flex flex-col h-full">
          {/* Game Header - Rounds, Score, Exit at top */}
          <div className="flex justify-between items-center text-white text-sm mb-4">
            <div>Round {currentRound}/{totalRounds}</div>
            <div>Total Score: {totalScore}</div>
            <button
              onClick={handleBackToHome}
              className="bg-red-900/20 hover:bg-red-800/30 text-red-400 hover:text-red-300 font-semibold cursor-pointer px-4 py-2 rounded-lg transition-colors"
            >
              LEAVE GAME
            </button>
          </div>

          {/* Wallet Connection Status for Paid Players */}
          {address && !isTrialGame && (
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 text-green-300 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Wallet Connected</span>
                  <span className="text-green-200/80">• Playing for real money</span>
                </div>
                <div className="text-green-200/60 text-xs mt-1 text-center">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
            </div>
          )}

          {/* Trial Player Status */}
          {isTrialGame && (
            <div className="flex justify-center mb-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 text-amber-300 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="font-medium">Trial Game</span>
                  <span className="text-amber-200/80">• Practice mode</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Title */}
          <div className="text-center mb-6">
            <div className="text-white text-xl font-bold font-audiowide">
              <h1>NAME THAT TUNE...</h1>
            </div>
          </div>

          {/* Question Info */}
          <div className="text-center mb-4">
            <div className="bg-gray-800 rounded-full px-4 py-2 inline-block">
              <div className="text-white text-sm">
                 Beat {questionNumberInRound}/{questionsPerRound}
              </div>
            </div>
          </div>

          {/* Big Red Countdown Display */}
          {!isAnswered && (
            <div className="flex justify-center mb-6">
              {gameTimeRemaining <= 0 ? (
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono text-red-500 animate-pulse bg-black/20 rounded-full px-6 sm:px-8 py-4 sm:py-6">
                  {`TIME'S UP`}
                </div>
              ) : (
                <div 
                  className={`text-6xl sm:text-7xl md:text-8xl font-bold font-mono drop-shadow-lg transition-all duration-300 ${
                    gameTimeRemaining <= 5 && gameTimeRemaining > 0
                      ? 'text-red-500 animate-pulse bg-black/20 rounded-full px-4 sm:px-8 py-2 sm:py-4'
                      : 'text-red-400'
                  }`}
                  style={{
                    textShadow: gameTimeRemaining <= 5 && gameTimeRemaining > 0
                      ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)'
                      : '0 0 10px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  {Math.ceil(gameTimeRemaining)}
                </div>
              )}
            </div>
          )}

          {/* Audio Player */}
          {currentQuestion?.audioUrl && !audioError && (
            <div className="mb-6">
              <AudioPlayer 
                key={currentQuestion.audioUrl}
                audioUrl={currentQuestion.audioUrl}
                autoPlay={true}
                clipDurationSeconds={10}
                onTimeUpdate={handleAudioTimeUpdate}
                onError={handleAudioError}
                className="bg-transparent border-0 shadow-none"
              />
            </div>
          )}

          {/* Audio Error Fallback */}
          {currentQuestion && (!currentQuestion.audioUrl || audioError) && (
            <div className="h-20 flex items-center justify-center bg-gray-800 rounded-lg mb-6">
              <div className="text-white text-center">
                <div className="text-sm text-gray-400">
                  {audioError ? 'Audio failed, trying different song...' : 'Audio not available'}
                </div>
              </div>
            </div>
          )}

          {/* Next Question Button */}
          {(isAnswered || gameTimeRemaining <= 0) && (
            <div className="text-center mb-4">
              <button
                onClick={handleNextQuestion}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg cursor-pointer"
              >
                {questionNumberInRound >= questionsPerRound && currentRound >= totalRounds
                  ? 'Finish Game'
                  : <>Next <span className="font-audiowide">BEAT</span></>}
              </button>
            </div>
          )}

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-4 mb-4 mt-4 ">
            {currentQuestion?.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered || gameTimeRemaining <= 0}
                className={`p-4 rounded-lg text-left transition-colors cursor-pointer ${
                  isAnswered
                    ? isVerifying
                      ? selectedAnswer === index
                        ? 'bg-purple-600 text-white animate-pulse'  // Pulsing while verifying
                        : 'bg-gray-700 text-gray-400'
                      : selectedAnswer === index
                        ? verifiedCorrectAnswer === index
                          ? 'bg-green-600 text-white'  // Green if selected AND correct
                          : 'bg-red-600 text-white'    // Red if selected AND wrong
                        : verifiedCorrectAnswer === index
                          ? 'bg-green-600/50 text-white'  // Dim green to reveal correct answer
                          : 'bg-gray-700 text-gray-400'  // Gray for unselected options
                    : gameTimeRemaining <= 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Current Round Stats and Players */}
          <div className="text-center">
            
            {/* Current Paid Players Avatars */}
            {!isTrialGame && gameStarted && (
            <div className="mb-4 flex justify-center">
              <ActivePlayers 
                className="justify-center" 
                maxPlayers={16}
                showTooltips={true}
              />
            </div>
            )}
            
            <div className="text-white text-sm">YOUR POINTS THIS ROUND: {score}</div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#000000] min-h-screen w-full flex items-start justify-center px-4 py-8 overflow-x-hidden">
      <div className="relative w-full max-w-[390px] md:max-w-[428px]" data-name="home" data-node-id="1:2">
        {/* Floating Avatars - positioned absolutely */}
        <div className="hidden">
        <div className="absolute flex h-[44.091px] items-center justify-center left-[358px] top-[260px] w-[44.091px] z-0 animate-float [animation-delay:200ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:169">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[317px] top-[415px] w-[44.091px] z-0 animate-float2 [animation-delay:500ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:267">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[305px] top-[341px] w-[44.091px] z-0 animate-float3 [animation-delay:800ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:172">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[7px] top-[388px] w-[44.091px] z-0 animate-float [animation-delay:1000ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:261">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[54px] top-[442px] w-[44.091px] z-0 animate-float2 [animation-delay:1200ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:269">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[40.364px] items-center justify-center left-[1.86px] top-[276.82px] w-[40.364px] z-0 animate-float3 [animation-delay:1400ms]">
          <div className="flex-none rotate-[7.451deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:170">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[133px] top-[205px] w-[44.091px] z-0 animate-float [animation-delay:300ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:171">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[44.091px] items-center justify-center left-[229px] top-[401px] w-[44.091px] z-0 animate-float2 [animation-delay:900ms]">
          <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:270">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[45.938px] items-center justify-center left-[119px] top-[412px] w-[45.938px] z-0 animate-float3 [animation-delay:1600ms]">
          <div className="flex-none rotate-[19.462deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:264">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
            </div>
          </div>
        </div>
        <div className="absolute flex h-[45.938px] items-center justify-center left-[297px] top-[203px] w-[45.938px] z-0 animate-float [animation-delay:1800ms]">
          <div className="flex-none rotate-[19.462deg] circle-hover animate-pulse-glow">
            <div className="relative size-9" data-node-id="3:268">
              <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
            </div>
          </div>
        </div>
        </div>
        
        {/* Main content container - centered using Flexbox */}
        <div className="flex flex-col items-center w-full min-h-screen">
          
          {/* GameTitle component (includes both title and subtitle) */}
          <div className="flex justify-center mt-10 mb-8">
            <GameTitle />
          </div>

          {/* Container for the LIVE BATTLE card and JOIN GAME button */}
          <div className="flex flex-col items-center mb-10">
            {/* LIVE BATTLE Card + Scoped Floating Avatars */}
            <div className="relative w-[328px] my-4">
              {/* Floating avatars around card, scoped to this container */}
              <div className="absolute top-[-50px] left-[-20px] z-0 animate-float [animation-delay:200ms]">
                <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
                  </div>
                </div>
              </div>
              <div className="absolute top-[-30px] right-[-30px] z-0 animate-float2 [animation-delay:500ms]">
                <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
                  </div>
                </div>
              </div>
              <div className="absolute top-[20px] left-[-40px] z-0 animate-float3 [animation-delay:800ms]">
                <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
                  </div>
                </div>
              </div>
              <div className="absolute top-[40px] right-[-25px] z-0 animate-float [animation-delay:1000ms]">
                <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
                  </div>
                </div>
              </div>
              <div className="absolute top-[100px] left-[-30px] z-0 animate-float2 [animation-delay:1200ms]">
                <div className="flex-none rotate-[345deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
                  </div>
                </div>
              </div>
              <div className="absolute top-[120px] right-[-35px] z-0 animate-float3 [animation-delay:1400ms]">
                <div className="flex-none rotate-[19.462deg] circle-hover animate-pulse-glow">
                  <div className="relative size-9">
                    <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
                  </div>
                </div>
              </div>

              {/* LIVE BATTLE Card */}
              <div className="relative z-10 bg-[#ffffff] box-border p-4 rounded-2xl w-full" data-node-id="3:164">
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="3:162">
                  <div className="content-stretch flex gap-1 items-center justify-start relative shrink-0" data-node-id="3:326">
                    <div className="relative shrink-0 size-8" data-name="ui/flame" data-node-id="3:141">
                      <p className="block max-w-none size-full text-2xl">🔥</p>
                    </div>
                    <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[12px] text-nowrap" data-node-id="3:111">
                      <p className="leading-[normal] whitespace-pre">LIVE BATTLE</p>
                    </div>
                  </div>
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:324">
                    <p className="leading-[normal] whitespace-pre">
                      {getTimerDisplay()}
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full" data-node-id="3:163">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[24px] w-full">
                    <p className="leading-[normal]">
                      {contractBalanceError ? (
                        <span className="text-red-500">Error loading balance</span>
                      ) : contractBalanceLoading ? (
                        '...'
                      ) : (
                        `${sessionPrizePool.toFixed(3)} USDC`
                      )}
                    </p>
                  </div>
                  <p className="font-['Audiowide:Regular',_sans-serif] text-[#000000] text-[9px] leading-snug max-w-full">
                    Current session prize pool. Grows by {contractEntryFee > 0 ? contractEntryFee : ENTRY_FEE_USDC} USDC per paid entry.
                  </p>
                  {/* Prize distribution breakdown */}
                  {!contractBalanceLoading && sessionPrizePool > 0 && (
                    <div className="flex gap-3 w-full font-['Audiowide:Regular',_sans-serif] text-[#000000] text-[8px]">
                      <span>1st: {(sessionPrizePool * 0.9 * 0.6).toFixed(2)}</span>
                      <span>2nd: {(sessionPrizePool * 0.9 * 0.3).toFixed(2)}</span>
                      <span>3rd: {(sessionPrizePool * 0.9 * 0.1).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0 w-full" data-node-id="3:161">
                    <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:159">
                      <p className="leading-[normal] whitespace-pre">
                        {onChainPlayerCount > 0 ? `${onChainPlayerCount} on-chain players` : getPlayerCountDisplay()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* JOIN GAME Button */}
            <div className={`bg-[#bc58ff] box-border p-3 rounded-2xl w-[328px] text-center font-['Audiowide:Regular',_sans-serif] text-[12px] text-[#000000] transition-colors ${canJoin ? 'cursor-pointer hover:bg-[#a847e6]' : 'cursor-not-allowed opacity-50'}`} data-node-id="3:166" onClick={canJoin ? handleJoinGame : undefined}>
              <p className="leading-[normal] text-nowrap whitespace-pre">JOIN GAME</p>
            </div>
          </div>
          
          {/* Container for the TOP EARNERS section */}
          <div className="flex flex-col items-center w-full">
            <h2 className="text-white text-lg font-['Audiowide:Regular',_sans-serif] mb-1">
              TOP EARNERS
            </h2>
            <p className="text-gray-400 text-[10px] font-['Audiowide:Regular',_sans-serif] mb-3 text-center max-w-[328px]">
              Paid games only — practice / trial scores are not listed
            </p>
            <div className="w-full max-w-[328px]">
              <TopEarners limit={10} />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}

