import { NextResponse } from 'next/server';
import {
  ORB_QR_CREDENTIALS,
  ORB_QR_INIT_URL,
  getOrbResponseMessage,
  getOrbResponseStatus,
  orbQrFetch,
} from '@/lib/orb/qrProxy.server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const url = new URL(ORB_QR_INIT_URL);
    url.searchParams.set('credentials', ORB_QR_CREDENTIALS);

    const response = await orbQrFetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Orb QR init failed (${response.status})` },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const status = getOrbResponseStatus(payload);

    if (status === 'FAILED') {
      return NextResponse.json(
        {
          error: getOrbResponseMessage(payload) ?? 'Orb QR init failed',
          status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Orb QR init proxy error:', error);
    return NextResponse.json(
      { error: 'Orb QR init proxy failed' },
      { status: 502 },
    );
  }
}
