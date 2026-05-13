import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const envCheck = {
    supabase: {
      url: !!process.env.SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cdp: {
      // New CDP API credentials
      apiKeyName: !!process.env.CDP_API_KEY_NAME,
      apiPrivateKey: !!process.env.CDP_API_KEY_PRIVATE_KEY,
      projectId: !!process.env.CDP_PROJECT_ID,
      // Legacy CDP credentials (for backward compatibility)
      apiKey: !!process.env.CDP_API_KEY,
      apiSecret: !!process.env.CDP_API_SECRET,
    },
    iron: {
      password: !!process.env.IRON_PASSWORD,
    },
    assets: {
      baseUrl: process.env.NEXT_PUBLIC_ASSET_BASE_URL || 'Not set',
      serverBaseUrl: process.env.ASSET_BASE_URL || 'Not set',
    },
  };

  return NextResponse.json(envCheck);
}
