import { NextRequest, NextResponse } from 'next/server';
import { verifyQuestionToken } from '@/lib/utils/questionToken';
import { verifyEntryToken } from '@/lib/utils/jwt';
import {
  addVerifiedAnswerScore,
  getPaidScoreLedgerEntry,
  initPaidScoreLedger,
} from '@/lib/game/paidScoreLedger';
import { advancePaidScore } from '@/lib/game/scoreReceipt';
import { ScoringSystem } from '@/lib/game/scoring';
import type { DifficultyLevel } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionToken, selectedAnswer, entryToken, scoreReceipt } = body;

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
    let nextScoreReceipt: string | undefined;
    let ledgerWarning: string | undefined;

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

      const onChainSessionId = payload.onChainSessionId ?? '';
      let ledgerEntry = getPaidScoreLedgerEntry(payload.entryId);
      if (!ledgerEntry) {
        initPaidScoreLedger({
          entryId: payload.entryId,
          walletAddress: wallet,
          onChainSessionId,
          paidTxHash: payload.paidTxHash,
        });
        ledgerEntry = getPaidScoreLedgerEntry(payload.entryId);
      }

      const advanced = advancePaidScore({
        entryId: payload.entryId,
        walletAddress: wallet,
        onChainSessionId,
        pointsEarned: isCorrect ? pointsEarned : 0,
        previousReceipt:
          typeof scoreReceipt === 'string' && scoreReceipt.trim() ? scoreReceipt.trim() : null,
        ledgerTotalScore: ledgerEntry?.totalScore,
        ledgerAnswersVerified: ledgerEntry?.answersVerified,
      });
      serverTotalScore = advanced.totalScore;
      nextScoreReceipt = advanced.receipt;

      const ledgerResult = addVerifiedAnswerScore(
        payload.entryId,
        wallet,
        isCorrect ? pointsEarned : 0,
      );
      if (!ledgerResult.ok) {
        ledgerWarning = ledgerResult.error;
        console.warn('paidScoreLedger update failed (score receipt used):', ledgerResult.error);
      }
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      pointsEarned,
      timeSpent,
      serverTotalScore,
      scoreReceipt: nextScoreReceipt,
      ledgerWarning,
    });
  } catch (error) {
    console.error('verify-answer error:', error);
    return NextResponse.json(
      { error: 'Failed to verify answer' },
      { status: 500 },
    );
  }
}
