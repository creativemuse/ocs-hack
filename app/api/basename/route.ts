import { NextRequest, NextResponse } from 'next/server';
import { getBasenameWithFallback } from '@/lib/base-account/basenameServer';

export const runtime = 'nodejs';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();
  const universal = request.nextUrl.searchParams.get('universal')?.trim() ?? undefined;

  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  if (universal && !ADDRESS_RE.test(universal)) {
    return NextResponse.json({ error: 'Invalid universal address' }, { status: 400 });
  }

  const basename = await getBasenameWithFallback(
    address.toLowerCase() as `0x${string}`,
    universal?.toLowerCase() as `0x${string}` | undefined,
  );

  return NextResponse.json(
    { basename },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
