'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { ASSETS } from '@/lib/config/assets';
import { useGameSession } from '@/hooks/useGameSession';
import { formatTimeRemainingText } from '@/lib/utils/timeUtils';
import GameEntry from '@/components/game/GameEntry';
import GuestModeEntry from '@/components/game/GuestModeEntry';
import GamePayment from '@/components/game/GamePayment';
import AudioPlayer from '@/components/game/AudioPlayer';
import ActivePlayers from '@/components/game/ActivePlayers';
import type { TriviaQuestion } from '@/types/game';
import { ScoringSystem } from '@/lib/game/scoring';
import { useAccount } from 'wagmi';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import GameTitle from '@/components/ui/GameTitle';

export default function Home() {
  const router = useRouter();
  const { session, timeRemaining, canJoin, isLoading, waitingForPaidPlayer, joinGame, leaveGame } = useGameSession();
  const [showGameEntry, setShowGameEntry] = useState(false);
  const [showGuestMode, setShowGuestMode] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isTrialGame, setIsTrialGame] = useState(false);
  const [guestName, setGuestName] = useState('');

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
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const totalRounds = 3;
  const questionsPerRound = 10;
  const [questionNumberInRound, setQuestionNumberInRound] = useState(1);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const timerTriggeredRef = useRef(false);

  // Add trial status hook
  const { address } = useAccount();
  const { trialStatus, incrementTrialGame } = useTrialStatus(address);

  const loadRandomQuestion = useCallback(async () => {
    setGameLoading(true);
    setGameError(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setStartTime(Date.now());
    setGameTimeRemaining(10);
    setAudioCurrentTime(0);
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

      const res = await fetch(`/api/lighthouse-questions?${params.toString()}`, { 
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load question');
      }

      const data: { questions: TriviaQuestion[] } = await res.json();

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
    // Show the game entry options instead of navigating
    setShowGameEntry(true);
  };

  const handleGuestStart = async (name: string) => {
    try {
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
    setShowGameEntry(false);
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    setIsTrialGame(false);
    setGameStarted(true);
    loadRandomQuestion();
  };

  const handlePaymentBack = () => {
    setShowPayment(false);
    setShowGameEntry(true);
  };

  const handleGameStart = async ({ isTrial }: { isTrial: boolean }) => {
    try {
      // Join the game session accordingly
      await joinGame(!isTrial);
      setIsTrialGame(isTrial);
      setGameStarted(true);
      setShowGameEntry(false);
      loadRandomQuestion();
    } catch (error) {
      console.error('Error joining game:', error);
      // Handle error - could show a message to user
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
      setShowGameEntry(false);
      setShowGuestMode(false);
      setShowPayment(false);
      setGameStarted(false);
      setIsGuestMode(false);
      setIsTrialGame(false);
      setGameCompleted(false);
      setScore(0);
      setTotalScore(0);
      setCurrentRound(1);
      setQuestionNumberInRound(1);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered || !currentQuestion) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    if (isCorrect) {
      const timeSpentMs = Date.now() - startTime;
      const timeSpent = Math.round(timeSpentMs / 100) / 10;
      
      const pointsEarned = ScoringSystem.calculateQuestionScore(
        true,
        timeSpent,
        currentQuestion.timeLimit,
        currentQuestion.difficulty,
        0
      );
      
      setScore(prev => prev + pointsEarned);
      setTotalScore(prev => prev + pointsEarned);
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
          try {
            await incrementTrialGame();
            // Update local state to reflect trial has been used
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

  const handleAudioTimeUpdate = (currentTime: number, duration: number) => {
    setAudioCurrentTime(currentTime);
    const remaining = Math.max(0, Math.ceil(duration - currentTime));
    setGameTimeRemaining(remaining);
  };

  const handleAudioError = () => {
    console.log('Audio failed, trying different question...');
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
      // Leave the game session when component unmounts
      if (session) {
        leaveGame().catch(error => {
          console.error('Error leaving game session on unmount:', error);
        });
      }
    };
  }, [session, leaveGame]);

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

  // Show payment screen
  if (showPayment) {
    return (
      <GamePayment 
        onPaymentComplete={handlePaymentComplete}
        onBack={handlePaymentBack}
      />
    );
  }

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

  // Show game entry screen
  if (showGameEntry) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px]">
          <GameEntry onGameStart={handleGameStart} />
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
                {trialStatus.isTrialActive ? (isGuestMode ? `Trial Player: ${guestName}` : 'Trial Player') : 'Paid Player'}
              </div>

              {/* Trial Player Notice */}
              {trialStatus.isTrialActive && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                  <div className="text-amber-300 text-sm">
                    <p className="font-medium mb-2">🎮 Trial Game Results</p>
                    <p className="text-amber-200/80">
                      This was a practice game. Your score won't qualify for prizes from the prize pool.
                      Connect your wallet to play for real money and compete for prizes!
                    </p>
                  </div>
                </div>
              )}

              {/* Paid Player Success */}
              {!trialStatus.isTrialActive && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <div className="text-green-300 text-sm">
                    <p className="font-medium mb-2">🏆 Prize Pool Entry</p>
                    <p className="text-green-200/80">
                      Your score qualifies for prizes! You'll be entered into the prize pool distribution.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleBackToHome}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-lg"
            >
              Play Again
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

          {/* Game Title */}
          <div className="text-center mb-6">
            <div className="text-white text-xl font-bold font-audiowide">
              <h1>NAME THAT BEAT...</h1>
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
                    ? selectedAnswer === index
                      ? index === currentQuestion.correctAnswer
                        ? 'bg-green-600 text-white'  // Green if selected AND correct
                        : 'bg-red-600 text-white'    // Red if selected AND wrong
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
            <div className="mb-4 flex justify-center">
              <ActivePlayers 
                className="justify-center" 
                maxPlayers={16}
                showTooltips={true}
              />
            </div>
            
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
                    <p className="leading-[normal]">{`${session?.prize_pool || 0} USDC TOTAL `}</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0 w-full" data-node-id="3:161">
                    <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:159">
                      <p className="leading-[normal] whitespace-pre">
                        {getPlayerCountDisplay()}
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
            <h2 className="text-white text-lg font-['Audiowide:Regular',_sans-serif] mb-4">
              TOP EARNERS
            </h2>
            {/* Top Earners List */}
            <div className="w-full max-w-[328px]">
              {/* #1 - Trophy */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:205">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:204">
                  <div className="content-stretch flex gap-2.5 items-center justify-start relative shrink-0 w-5" data-node-id="3:278">
                    <div className="text-yellow-400 text-xl">🏆</div>
                  </div>
                  <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:203">
                    <div className="relative shrink-0 size-9" data-node-id="3:176">
                      <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse7} width="36" />
                    </div>
                    <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:177">
                      <p className="leading-[normal] whitespace-pre">JESSE.BASE.ETH</p>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:178">
                  <p className="leading-[normal] whitespace-pre">400 USDC</p>
                </div>
              </div>
              {/* #2 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:206">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:277">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:205">
                    <p className="leading-[normal]">#2</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:207">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:209">
                      <div className="relative shrink-0 size-9" data-node-id="3:210">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:211">
                        <p className="leading-[normal] whitespace-pre">JD.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:212">
                  <p className="leading-[normal] whitespace-pre">380 USDC</p>
                </div>
              </div>
              {/* #3 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:279">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:280">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:281">
                    <p className="leading-[normal]">#3</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:282">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:283">
                      <div className="relative shrink-0 size-9" data-node-id="3:284">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:285">
                        <p className="leading-[normal] whitespace-pre">GRROK.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:286">
                  <p className="leading-[normal] whitespace-pre">300 USDC</p>
                </div>
              </div>
              {/* #4 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:288">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:289">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:290">
                    <p className="leading-[normal]">#4</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:291">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:292">
                      <div className="relative shrink-0 size-9" data-node-id="3:293">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:294">
                        <p className="leading-[normal] whitespace-pre">SIMON.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:295">
                  <p className="leading-[normal] whitespace-pre">250 USDC</p>
                </div>
              </div>
              {/* #5 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:297">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:298">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:299">
                    <p className="leading-[normal]">#5</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:300">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:301">
                      <div className="relative shrink-0 size-9" data-node-id="3:302">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse8} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:303">
                        <p className="leading-[normal] whitespace-pre">AK.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:304">
                  <p className="leading-[normal] whitespace-pre">200 USDC</p>
                </div>
              </div>
              {/* #6 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3" data-node-id="3:306">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:307">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5" data-node-id="3:308">
                    <p className="leading-[normal]">#6</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-node-id="3:309">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="3:310">
                      <div className="relative shrink-0 size-9" data-node-id="3:311">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse9} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:312">
                        <p className="leading-[normal] whitespace-pre">PEPE.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap" data-node-id="3:313">
                  <p className="leading-[normal] whitespace-pre">100 USDC</p>
                </div>
              </div>
              {/* #7 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                    <p className="leading-[normal]">#7</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                      <div className="relative shrink-0 size-9">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse10} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                        <p className="leading-[normal] whitespace-pre">ALICE.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                  <p className="leading-[normal] whitespace-pre">80 USDC</p>
                </div>
              </div>
              {/* #8 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                    <p className="leading-[normal]">#8</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                      <div className="relative shrink-0 size-9">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse4} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                        <p className="leading-[normal] whitespace-pre">BOB.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                  <p className="leading-[normal] whitespace-pre">60 USDC</p>
                </div>
              </div>
              {/* #9 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                    <p className="leading-[normal]">#9</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                      <div className="relative shrink-0 size-9">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse5} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                        <p className="leading-[normal] whitespace-pre">CAROL.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                  <p className="leading-[normal] whitespace-pre">40 USDC</p>
                </div>
              </div>
              {/* #10 */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3">
                <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                    <p className="leading-[normal]">#10</p>
                  </div>
                  <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
                    <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                      <div className="relative shrink-0 size-9">
                        <Image alt="player avatar" className="block max-w-none size-full" height="36" src={ASSETS.ellipse6} width="36" />
                      </div>
                      <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                        <p className="leading-[normal] whitespace-pre">DAVE.BASE.ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                  <p className="leading-[normal] whitespace-pre">20 USDC</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
