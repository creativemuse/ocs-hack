import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const envVars = {
      NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS,
      NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
      NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
      NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envVars,
      message: 'Environment variables check',
    });
  } catch (error) {
    console.error('Debug ENV API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get environment variables',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}