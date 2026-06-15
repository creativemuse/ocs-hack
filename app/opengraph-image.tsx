import { ImageResponse } from 'next/og';
import { BeatMeOgLayout } from '@/lib/og/beatMeOgLayout';

export const runtime = 'edge';
export const alt = 'BEAT ME — Name the tune, win a reward';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <BeatMeOgLayout headline="Can you BEAT ME?" />,
    { ...size },
  );
}
