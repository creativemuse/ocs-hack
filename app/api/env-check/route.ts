import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const envCheck = {
    supabase: {
      url: !!process.env.SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    onchainkit: {
      apiKey: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    },
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(envCheck);
}
