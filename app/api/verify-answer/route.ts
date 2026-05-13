import { NextRequest, NextResponse } from 'next/server';
import { verifyQuestionToken } from '@/lib/utils/questionToken';
import { ScoringSystem } from '@/lib/game/scoring';
import type { DifficultyLevel } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionToken, selectedAnswer } = body;

    if (typeof questionToken !== 'string' || typeof selectedAnswer !== 'number') {
      return NextResponse.json(
        { error: 'questionToken (string) and selectedAnswer (number) are required' },
        { status: 400 },
      );
    }

    if (selectedAnswer < 0 || selectedAnswer > 5 || !Number.isInteger(selectedAnswer)) {
      return NextResponse.json(
        { error: 'selectedAnswer must be an integer between 0 and 5' },
        { status: 400 },
      );
    }

    const question = verifyQuestionToken(questionToken);
    if (!question) {
      return NextResponse.json(
        { error: 'Invalid or expired question token' },
        { status: 401 },
      );
    }

    const isCorrect = selectedAnswer === question.correctAnswer;
    const timeSpentMs = Date.now() - question.issuedAt;
    const timeSpent = Math.round(timeSpentMs / 100) / 10; // seconds, 0.1 precision

    const pointsEarned = ScoringSystem.calculateQuestionScore(
      isCorrect,
      timeSpent,
      question.timeLimit,
      question.difficulty as DifficultyLevel,
      // Streak is not tracked server-side per-request (would require session state).
      // The streak bonus is small (max +10 points) and the max-score cap on
      // save-paid-score prevents abuse. Client tracks streak for UI display only.
      0,
    );

    return NextResponse.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      pointsEarned,
      timeSpent,
    });
  } catch (error) {
    console.error('verify-answer error:', error);
    return NextResponse.json(
      { error: 'Failed to verify answer' },
      { status: 500 },
    );
  }
}
