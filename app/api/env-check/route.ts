import { NextRequest, NextResponse } from 'next/server';

import { tryInitializeSpacetime } from '@/lib/apis/tryInitializeSpacetime';
import { hasMainnetRpc } from '@/lib/rpc/getMainnetRpcUrl';

export async function GET(_req: NextRequest) {
  const spacetimeInit = await tryInitializeSpacetime();

  const envCheck = {
    supabase: {
      url: !!process.env.SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cdp: {
      apiKeyName: !!process.env.CDP_API_KEY_NAME,
      apiPrivateKey: !!process.env.CDP_API_KEY_PRIVATE_KEY,
      projectId: !!process.env.CDP_PROJECT_ID,
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
    rpc: {
      mainnetConfigured: hasMainnetRpc(),
      mainnetRpcUrl: !!process.env.MAINNET_RPC_URL,
      alchemyServerKey: !!process.env.ALCHEMY_API_KEY,
      alchemyPublicKey: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
      baseRpcUrl: !!(
        process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL
      ),
    },
    spacetime: {
      host: !!(
        process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST
      ),
      module: !!(
        process.env.SPACETIME_MODULE || process.env.NEXT_PUBLIC_SPACETIME_MODULE
      ),
      serverToken: !!process.env.SPACETIME_TOKEN,
      connected: spacetimeInit.configured,
      initOk: spacetimeInit.ok,
      initError: spacetimeInit.error ?? null,
      orbLinkReady: !!(
        process.env.SPACETIME_TOKEN &&
        (process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST) &&
        (process.env.SPACETIME_MODULE || process.env.NEXT_PUBLIC_SPACETIME_MODULE)
      ),
    },
    auth: {
      entryTokenSecret: !!process.env.ENTRY_TOKEN_SECRET,
    },
  };

  return NextResponse.json(envCheck);
}
