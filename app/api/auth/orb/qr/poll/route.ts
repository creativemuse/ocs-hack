import { NextRequest, NextResponse } from 'next/server';
import {
  ORB_QR_POLL_URL,
  getOrbResponseMessage,
  getOrbResponseStatus,
  orbQrFetch,
} from '@/lib/orb/qrProxy.server';

export const runtime = 'nodejs';

type PollBody = {
  secret?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PollBody;
    const secret = body.secret?.trim();

    if (!secret) {
      return NextResponse.json({ error: 'Missing secret' }, { status: 400 });
    }

    const response = await orbQrFetch(ORB_QR_POLL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Orb QR poll failed (${response.status})` },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const status = getOrbResponseStatus(payload);

    if (status === 'FAILED') {
      return NextResponse.json(
        {
          error: getOrbResponseMessage(payload) ?? 'Orb QR poll failed',
          status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Orb QR poll proxy error:', error);
    return NextResponse.json(
      { error: 'Orb QR poll proxy failed' },
      { status: 502 },
    );
  }
}
