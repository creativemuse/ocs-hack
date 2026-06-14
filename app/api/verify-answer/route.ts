import { NextRequest, NextResponse } from 'next/server';
import { verifyQuestionToken } from '@/lib/utils/questionToken';
import { verifyEntryToken } from '@/lib/utils/jwt';
import { addVerifiedAnswerScore } from '@/lib/game/paidScoreLedger';
import { ScoringSystem } from '@/lib/game/scoring';
import type { DifficultyLevel } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionToken, selectedAnswer, entryToken } = body;

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
    const timeSpent = Math.round(timeSpentMs / 100) / 10;

    const pointsEarned = ScoringSystem.calculateQuestionScore(
      isCorrect,
      timeSpent,
      question.timeLimit,
      question.difficulty as DifficultyLevel,
      0,
    );

    let serverTotalScore: number | undefined;

    if (entryToken && typeof entryToken === 'string') {
      const payload = verifyEntryToken(entryToken);
      if (!payload || payload.playerType !== 'paid') {
        return NextResponse.json(
          { error: 'Invalid or non-paid entry token' },
          { status: 401 },
        );
      }
      const wallet = payload.identity.walletAddress;
      if (!wallet) {
        return NextResponse.json(
          { error: 'Paid entry token missing wallet address' },
          { status: 401 },
        );
      }
      const ledgerResult = addVerifiedAnswerScore(
        payload.entryId,
        wallet,
        isCorrect ? pointsEarned : 0,
      );
      if (!ledgerResult.ok) {
        return NextResponse.json({ error: ledgerResult.error }, { status: 400 });
      }
      serverTotalScore = ledgerResult.totalScore;
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      pointsEarned,
      timeSpent,
      serverTotalScore,
    });
  } catch (error) {
    console.error('verify-answer error:', error);
    return NextResponse.json(
      { error: 'Failed to verify answer' },
      { status: 500 },
    );
  }
}
