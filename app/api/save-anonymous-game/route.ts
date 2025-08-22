import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabase } from '@/lib/apis/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, score, questions, answers } = await req.json();
    
    // Save game session
    await SupabaseDatabase.saveGameSession({
      sessionId,
      totalScore: score,
      entryFee: 0,
      questions,
      answers
    });
    
    // Update anonymous session stats
    await SupabaseDatabase.updateAnonymousSession(sessionId, score);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving anonymous game:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 }
    );
  }
}
