'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import AudioPlayer from '@/components/game/AudioPlayer';
import CountdownDisplay from '@/components/game/CountdownDisplay';
import ActivePlayers from '@/components/game/ActivePlayers';
import PlayerCount from '@/components/game/PlayerCount';
import type { TriviaQuestion } from '@/types/game';
import { ASSETS } from '@/lib/config/assets';
import { ScoringSystem } from '@/lib/game/scoring';

export default function Game() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const totalRounds = 3;
  const questionsPerRound = 10;
  const [questionNumberInRound, setQuestionNumberInRound] = useState(1);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const loadRandomQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setStartTime(Date.now());
    setTimeRemaining(10);
    setAudioCurrentTime(0);
    setAudioError(false);

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
      console.log('🎵 Loaded question:', {
        audioUrl: question.audioUrl,
        songTitle: question.metadata?.songTitle,
        artistName: question.metadata?.artistName,
        source: question.metadata?.source
      });

      // Test if the audio URL is accessible
      if (question.audioUrl && question.audioUrl.startsWith('http')) {
        fetch(question.audioUrl, { method: 'HEAD' })
          .then(response => {
            console.log('🎵 Audio URL test:', {
              url: question.audioUrl,
              status: response.status,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length'),
              acceptRanges: response.headers.get('accept-ranges')
            });
          })
          .catch(error => {
            console.error('🎵 Audio URL test failed:', question.audioUrl, error);
          });
      }

      setCurrentQuestion(question);
      setStartTime(Date.now()); // Reset timer when question loads
    } catch (e) {
      console.error('❌ Error loading question:', e);
      setError(e instanceof Error ? e.message : 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRandomQuestion();
  }, [loadRandomQuestion]);

  // Timer effect - now synced with audio player
  useEffect(() => {
    if (isAnswered || isLoading || !currentQuestion) return;

    // When time runs out, mark as answered
    if (timeRemaining <= 0 && !isAnswered) {
      setIsAnswered(true);
    }
  }, [timeRemaining, isAnswered, isLoading, currentQuestion]);

  const handleLeaveRoom = () => {
    router.push('/');
  };

  const handleAudioError = () => {
    console.log('Audio failed, trying different question...');
    setAudioError(true);
    // Try loading a different question after a short delay
    setTimeout(() => {
      loadRandomQuestion();
    }, 1000);
  };

  const handleLeaveRoomKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleLeaveRoom();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered || !currentQuestion) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    if (isCorrect) {
      // Calculate precise time spent with millisecond accuracy, then round to tenths
      const timeSpentMs = Date.now() - startTime;
      const timeSpent = Math.round(timeSpentMs / 100) / 10; // Round to nearest 0.1 seconds
      
      // Use the new scoring system for time-based points
      const pointsEarned = ScoringSystem.calculateQuestionScore(
        true,
        timeSpent,
        currentQuestion.timeLimit,
        currentQuestion.difficulty,
        0 // No streak bonus for single questions
      );
      
      setScore(prev => prev + pointsEarned);
      setTotalScore(prev => prev + pointsEarned);
    }
  };

  const handleNextQuestion = () => {
    // Advance question/round counters and reset per-round state if needed
    if (questionNumberInRound >= questionsPerRound) {
      if (currentRound < totalRounds) {
        setCurrentRound(prev => prev + 1);
        setQuestionNumberInRound(1);
        setScore(0);
      } else {
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
    // Sync countdown with audio time: show remaining time based on audio progress
    const remaining = Math.max(0, Math.ceil(duration - currentTime));
    setTimeRemaining(remaining);
  };

  if (isLoading) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-4">Error: {error}</div>
          <button 
            onClick={loadRandomQuestion}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px] text-center text-white">
          <h2 className="text-2xl font-audiowide mb-2">All Rounds Complete</h2>
          <p className="mb-6 text-sm">Total Score: {totalScore} USDC</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentRound(1);
                setQuestionNumberInRound(1);
                setScore(0);
                setTotalScore(0);
                setGameCompleted(false);
                loadRandomQuestion();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-[#32353d] hover:bg-[#404550] text-white px-4 py-2 rounded-lg"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#000000] min-h-screen w-full flex items-start justify-center px-4 py-4 overflow-x-hidden">
      <div className="relative w-full max-w-[390px] md:max-w-[428px]">
        <div className="bg-[#000000] overflow-visible relative rounded-3xl min-h-[1100px] w-full" data-name="game" data-node-id="3:328">
          {/* Voice/Music Icon */}
          {/* <div className="absolute left-[29px] size-[336px] top-[50px]" data-name="noun-voice-7962361 1" data-node-id="3:417">
            <Image alt="music icon" className="block max-w-none size-full" src={ASSETS.nounVoice79623611} width={336} height={336} />
          </div> */}
          
          {/* Leave Room Button */}
          <div className="absolute bg-[#32353d] box-border content-stretch flex gap-2.5 items-center justify-center left-[262px] p-[10px] rounded-lg top-[18px] cursor-pointer hover:bg-[#404550] transition-colors" data-node-id="3:458" role="button" tabIndex={0} aria-label="Leave room and return home" onClick={handleLeaveRoom} onKeyDown={handleLeaveRoomKeyDown}>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#cf202f] text-[12px] text-center text-nowrap" data-node-id="3:457">
              <p className="leading-[normal] whitespace-pre">LEAVE ROOM</p>
            </div>
          </div>

          {/* Round Indicator */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[80px] bg-[#1f2937] text-white text-[11px] px-3 py-1 rounded-full border border-white/10">
            Round {currentRound} of {totalRounds} • Q {questionNumberInRound}/{questionsPerRound}
          </div>

          {/* Countdown Display */}
          {!isAnswered && (
            <div className="absolute left-[29px] top-[150px] w-[336px]">
              <CountdownDisplay 
                timeRemaining={timeRemaining}
                className="z-10"
              />
            </div>
          )}

          {/* Audio Player - positioned where the waveform would be */}
          {currentQuestion?.audioUrl && !audioError && (
            <div className="absolute left-[29px] top-[200px] w-[336px]">
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
            <div className="absolute left-[29px] top-[200px] w-[336px] h-20 flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-white text-center">
                <div className="text-sm text-gray-400">
                  {audioError ? 'Audio failed, trying different song...' : 'Audio not available'}
                </div>
                {!audioError && (
                  <button 
                    onClick={loadRandomQuestion}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline"
                  >
                    Try different song
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Answer Options */}
          <div className="absolute content-stretch grid grid-cols-2 gap-2 items-start justify-start left-6 top-[400px] w-[345px]" data-node-id="3:442">
            {currentQuestion?.options.map((option, index) => (
              <div 
                key={index}
                className={`bg-[#ffffff] box-border content-stretch flex flex-col gap-3 h-[96px] items-start justify-start p-[16px] relative rounded-2xl shrink-0 w-full transition-colors ${
                  selectedAnswer === index 
                    ? index === currentQuestion.correctAnswer 
                      ? 'bg-green-200 border-2 border-green-500' 
                      : 'bg-red-200 border-2 border-red-500'
                    : isAnswered || timeRemaining <= 0
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-[#f0f0f0]'
                }`}
                onClick={() => {
                  // Only allow clicking if not answered and timer hasn't run out
                  if (!isAnswered && timeRemaining > 0) {
                    handleAnswerSelect(index);
                  }
                }}
              >
                <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full" data-node-id="3:428">
                  <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[18px] w-full" data-node-id="3:429">
                    <p className="leading-[normal]">{option}</p>
                  </div>
                  <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full" data-node-id="3:430">
                    <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[8px] text-nowrap" data-node-id="3:431">
                      <p className="leading-[normal] whitespace-pre">
                        {selectedAnswer === index 
                          ? index === currentQuestion.correctAnswer 
                            ? '✅ CORRECT!' 
                            : '❌ INCORRECT'
                          : ''
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* BEAT ME Title with Audiowide Font */}
          <div className="absolute left-6 top-[29px] w-[92px] h-3.5 flex items-center" data-name="BEATME Title" data-node-id="3:455">
            <h1 className="text-white text-lg font-audiowide tracking-wider whitespace-nowrap">
              BEAT ME
            </h1>
          </div>
          
          {/* Next Question Button - shown after answering */}
          {isAnswered && (
            <div className="absolute left-6 top-[630px] w-[345px]">
              <button
                onClick={handleNextQuestion}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Next <span className="font-audiowide">Beat</span>
              </button>
            </div>
          )}
          
          {/* Rewards Section */}
          <div className="absolute font-['Audiowide:Regular',_sans-serif] leading-[0] left-[159px] not-italic text-[#ffffff] text-[12px] text-center text-nowrap top-[730px] translate-x-[-50%]" data-node-id="3:465">
            <p className="leading-[normal] whitespace-pre">YOUR POINTS THIS ROUND: {score} USDC</p>
          </div>
          
          <div className="absolute left-[75.5px] top-[700px] translate-x-[-50%]">
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic text-[#ffffff] text-[12px] text-center text-nowrap">
              <p className="leading-[normal] whitespace-pre">IN THIS ROUND</p>
            </div>
            <div className="mt-1">
              <PlayerCount showLabel={false} />
            </div>
          </div>
          
          {/* Active Players */}
          <div className="absolute left-36 top-[698px]">
            <ActivePlayers maxPlayers={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
