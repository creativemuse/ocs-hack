'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import AudioPlayer from '@/components/game/AudioPlayer';
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
  const [startTime, setStartTime] = useState<number>(Date.now());

  const loadRandomQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setStartTime(Date.now());

    try {
      const params = new URLSearchParams({
        bucket: 'Songs',
        folder: 'Global_Top_100',
        mode: 'name-that-tune',
        count: '1',
        difficulty: 'medium',
        choices: '4',
      });

      const res = await fetch(`/api/supabase-questions?${params.toString()}`, { 
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
        artistName: question.metadata?.artistName
      });

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

  const handleLeaveRoom = () => {
    router.push('/');
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
    }
  };

  const handleNextQuestion = () => {
    loadRandomQuestion();
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

          {/* Audio Player - positioned where the waveform would be */}
          {currentQuestion?.audioUrl && (
            <div className="absolute left-[29px] top-[200px] w-[336px]">
              <AudioPlayer 
                key={currentQuestion.audioUrl}
                audioUrl={currentQuestion.audioUrl}
                autoPlay={true}
                clipDurationSeconds={10}
                className="bg-transparent border-0 shadow-none"
              />
            </div>
          )}
          
          {/* Audio Error Fallback */}
          {currentQuestion && !currentQuestion.audioUrl && (
            <div className="absolute left-[29px] top-[200px] w-[336px] h-20 flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-white text-center">
                <div className="text-sm text-gray-400">Audio not available</div>
                <button 
                  onClick={loadRandomQuestion}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline"
                >
                  Try different song
                </button>
              </div>
            </div>
          )}
          
          {/* Answer Options */}
          <div className="absolute content-stretch grid grid-cols-2 gap-2 items-start justify-start left-6 top-[400px] w-[345px]" data-node-id="3:442">
            {currentQuestion?.options.map((option, index) => (
              <div 
                key={index}
                className={`bg-[#ffffff] box-border content-stretch flex flex-col gap-3 h-[96px] items-start justify-start p-[16px] relative rounded-2xl shrink-0 w-full cursor-pointer transition-colors ${
                  selectedAnswer === index 
                    ? index === currentQuestion.correctAnswer 
                      ? 'bg-green-200 border-2 border-green-500' 
                      : 'bg-red-200 border-2 border-red-500'
                    : 'hover:bg-[#f0f0f0]'
                }`}
                onClick={() => handleAnswerSelect(index)}
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
          
          {/* BEATME Title with Audiowide Font */}
          <div className="absolute left-6 top-[29px] w-[92px] h-3.5 flex items-center" data-name="BEATME Title" data-node-id="3:455">
            <h1 className="text-white text-lg font-audiowide tracking-wider">
              BEATME
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
          
          <div className="absolute font-['Audiowide:Regular',_sans-serif] leading-[0] left-[75.5px] not-italic text-[#ffffff] text-[12px] text-center text-nowrap top-[700px] translate-x-[-50%]" data-node-id="7:3">
            <p className="leading-[normal] whitespace-pre">IN THIS ROUND</p>
          </div>
          
          {/* Player Icons */}
          <div className="absolute box-border content-stretch flex items-center justify-start left-36 pl-0 pr-2 py-0 top-[698px]" data-node-id="7:7">
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:4">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:5">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:6">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:8">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:10">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:12">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:14">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:16">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:18">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:20">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:22">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:24">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:26">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:28">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:30">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:32">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:34">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
            <div className="mr-[-8px] relative shrink-0 size-5" data-node-id="7:36">
              <Image alt="player" className="block max-w-none size-full" height="20" src={ASSETS.ellipse14} width="20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
