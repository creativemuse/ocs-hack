'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AudioPlayer from './AudioPlayer';
import Timer from './Timer';
import type { TriviaQuestion } from '@/types/game';
import { Music, User, Calendar, TrendingUp, Tag } from 'lucide-react';
import Image from 'next/image';

interface TriviaQuestionProps {
  question: TriviaQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedAnswer: number, timeSpent: number) => void;
  /** Revealed correct answer index from server verification. Null while verifying. */
  verifiedCorrectAnswer?: number | null;
  /** Whether answer verification is in progress */
  isVerifying?: boolean;
  className?: string;
}

export default function TriviaQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  verifiedCorrectAnswer: externalVerified,
  isVerifying: externalVerifying,
  className = ''
}: TriviaQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isAnswered, setIsAnswered] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [verifiedAnswer, setVerifiedAnswer] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setStartTime(Date.now());
    setPointsEarned(0);
    setTimeSpent(0);
    setVerifiedAnswer(null);
    setVerifying(false);
  }, [question.id]);

  // Sync external verification state if provided by parent
  const resolvedCorrect = externalVerified ?? verifiedAnswer;
  const isCurrentlyVerifying = externalVerifying ?? verifying;

  const handleAnswerSelection = async (answerIndex: number): Promise<void> => {
    if (isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setVerifying(true);

    const timeSpentMs = Date.now() - startTime;
    const calculatedTimeSpent = Math.round(timeSpentMs / 100) / 10;
    setTimeSpent(calculatedTimeSpent);

    // Verify answer server-side
    try {
      const res = await fetch('/api/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionToken: question.questionToken,
          selectedAnswer: answerIndex,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifiedAnswer(data.correctAnswer);
        if (data.isCorrect) setPointsEarned(data.pointsEarned);
      }
    } catch {
      // Network error — no points awarded
    } finally {
      setVerifying(false);
    }

    onAnswer(answerIndex, calculatedTimeSpent);
  };

  const handleTimeUp = (): void => {
    if (isAnswered) return;
    
    const timeSpent = question.timeLimit;
    setIsAnswered(true);
    onAnswer(-1, timeSpent); // -1 indicates no answer selected
  };

  const getQuestionIcon = () => {
    switch (question.type) {
      case 'name-that-tune':
        return <Music className="h-5 w-5 text-purple-500" />;
      case 'artist-match':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'release-year':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'chart-position':
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case 'genre-classification':
        return <Tag className="h-5 w-5 text-pink-500" />;
      default:
        return <Music className="h-5 w-5 text-purple-500" />;
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expert':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOptionStyle = (index: number): string => {
    if (!isAnswered) {
      return 'hover:bg-blue-50 hover:border-blue-300 border-gray-200';
    }

    if (isCurrentlyVerifying) {
      return selectedAnswer === index
        ? 'bg-purple-100 border-purple-400 animate-pulse'
        : 'bg-gray-50 border-gray-200 text-gray-500';
    }

    if (resolvedCorrect !== null && index === resolvedCorrect) {
      return 'bg-green-100 border-green-500 text-green-800';
    }

    if (index === selectedAnswer && resolvedCorrect !== null && index !== resolvedCorrect) {
      return 'bg-red-100 border-red-500 text-red-800';
    }

    return 'bg-gray-50 border-gray-200 text-gray-500';
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getQuestionIcon()}
              <span className="text-sm font-medium text-gray-600">
                Question {questionNumber} of {totalQuestions}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getDifficultyColor(question.difficulty)}>
                {question.difficulty.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.type.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
            {question.question}
          </CardTitle>

          {/* Track metadata display */}
          {question.metadata && (
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-2">
              {question.metadata.artistName && (
                <span className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{question.metadata.artistName}</span>
                </span>
              )}
              {question.metadata.releaseYear && (
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{question.metadata.releaseYear}</span>
                </span>
              )}
              {question.metadata.genre && (
                <span className="flex items-center space-x-1">
                  <Tag className="h-3 w-3" />
                  <span>{question.metadata.genre}</span>
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Audio Player */}
          {question.audioUrl && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
              <AudioPlayer 
                audioUrl={question.audioUrl}
                autoPlay={true}
                clipDurationSeconds={10}
                className="shadow-md"
              />
            </div>
          )}

          {/* Album Art */}
          {question.imageUrl && (
            <div className="flex justify-center">
              <Image
                src={question.imageUrl}
                alt="Album artwork"
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl shadow-lg object-cover"
                width={192}
                height={192}
              />
            </div>
          )}

          {/* Timer */}
          <Timer
            key={question.id}
            initialTime={question.timeLimit}
            onTimeUp={handleTimeUp}
            isActive={!isAnswered}
            className="mb-6"
          />

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleAnswerSelection(index)}
                disabled={isAnswered}
                variant="outline"
                className={`h-auto p-4 text-left justify-start whitespace-normal border-2 transition-all duration-200 ${getOptionStyle(index)}`}
              >
                <span className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm md:text-base font-medium">
                    {option}
                  </span>
                </span>
              </Button>
            ))}
          </div>

          {/* Result Message */}
          {isAnswered && (
            <div className="text-center pt-4">
              {isCurrentlyVerifying ? (
                <div className="text-purple-600 font-semibold text-lg animate-pulse">
                  Checking answer...
                </div>
              ) : resolvedCorrect !== null && selectedAnswer === resolvedCorrect ? (
                <div className="space-y-2">
                  <div className="text-green-600 font-semibold text-lg">
                    🎉 Correct! Great job!
                  </div>
                  <div className="text-sm text-gray-600">
                    ⏱️ {timeSpent.toFixed(1)}s • +{pointsEarned} points
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {timeSpent <= 2 ? 'Lightning fast!' : timeSpent <= 5 ? 'Nice speed!' : 'Good answer!'}
                  </div>
                </div>
              ) : selectedAnswer === -1 ? (
                <div className="text-orange-600 font-semibold text-lg">
                  ⏰ Time&apos;s up!{resolvedCorrect !== null && <> The answer was &quot;{question.options[resolvedCorrect]}&quot;</>}
                </div>
              ) : (
                <div className="text-red-600 font-semibold text-lg">
                  ❌ Incorrect.{resolvedCorrect !== null && <> The answer was &quot;{question.options[resolvedCorrect]}&quot;</>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}