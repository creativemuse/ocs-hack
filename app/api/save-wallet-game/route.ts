import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabase } from '@/lib/apis/supabase';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, score, questions, answers } = await req.json();
    
    // Save game session
    await SupabaseDatabase.saveGameSession({
      playerAddress: walletAddress,
      totalScore: score,
      entryFee: 0, // You can modify this based on your game logic
      questions,
      answers
    });
    
    // Decrement trial games if still in trial
    await SupabaseDatabase.decrementTrialGames(walletAddress);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving wallet game:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 }
    );
  }
}
