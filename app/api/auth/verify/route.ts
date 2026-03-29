import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/base-account/auth';

/**
 * Verify SIWE signature and return JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature, address } = await request.json();
    
    if (!message || !signature || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the signature
    const isValid = await verifySignature(message, signature, address);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // In a production app, you would:
    // 1. Verify the signature using a proper library like viem
    // 2. Check the message format and nonce
    // 3. Generate a JWT token with user information
    // 4. Store the authentication state in a database
    
    // For now, we'll return a simple success response
    const token = Buffer.from(`${address}:${Date.now()}`).toString('base64');
    
    return NextResponse.json({
      success: true,
      token,
      address,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    });
  } catch (error) {
    console.error('❌ Failed to verify signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}
