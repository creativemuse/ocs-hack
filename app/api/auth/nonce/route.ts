import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/base-account/auth';

/**
 * Generate and store a nonce for SIWE authentication
 */
export async function GET(request: NextRequest) {
  try {
    const nonce = generateNonce();
    
    // In a production app, you would store this nonce in a database
    // with an expiration time and associate it with the user's session
    // For now, we'll just return it
    
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('❌ Failed to generate nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}
