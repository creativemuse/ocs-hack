import type { ReactElement } from 'react';

export type BeatMeOgOptions = {
  headline: string;
  subline?: string;
  score?: string;
  rank?: string;
};

export const BeatMeOgLayout = ({
  headline,
  subline = 'Name the tune, win a reward.',
  score,
  rank,
}: BeatMeOgOptions): ReactElement => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0014 0%, #1a0533 40%, #2d0a4e 100%)',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      padding: '48px',
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid #a855f7',
        borderRadius: '32px',
        padding: '56px 72px',
        background: 'rgba(0,0,0,0.45)',
        maxWidth: '1000px',
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: '0.08em',
          marginBottom: 16,
          background: 'linear-gradient(90deg, #c084fc, #f472b6)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        BEAT ME
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
        {headline}
      </div>
      {score && (
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#fbbf24',
            marginBottom: 12,
            lineHeight: 1,
          }}
        >
          {Number(score).toLocaleString()} pts
        </div>
      )}
      {rank && (
        <div style={{ fontSize: 32, color: '#c4b5fd', marginBottom: 12 }}>
          Rank #{rank} this week
        </div>
      )}
      <div style={{ fontSize: 28, color: '#d1d5db', textAlign: 'center' }}>{subline}</div>
    </div>
  </div>
);
