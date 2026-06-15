import type { ReactElement } from 'react';

export type BeatMeOgMode = 'thumbnailOnly' | 'scoreOverlay';

export type BeatMeOgOptions = {
  mode?: BeatMeOgMode;
  backgroundImageUrl?: string;
  headline?: string;
  subline?: string;
  score?: string;
  rank?: string;
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export const BeatMeOgLayout = ({
  mode = 'scoreOverlay',
  backgroundImageUrl,
  headline,
  subline = 'Name the tune, win a reward.',
  score,
  rank,
}: BeatMeOgOptions): ReactElement => {
  if (mode === 'thumbnailOnly' && backgroundImageUrl) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        <img
          src={backgroundImageUrl}
          alt=""
          width={OG_WIDTH}
          height={OG_HEIGHT}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
      }}
    >
      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt=""
          width={OG_WIDTH}
          height={OG_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '48px 56px',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {headline && (
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 12,
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            }}
          >
            {headline}
          </div>
        )}
        {score && (
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: '#fbbf24',
              marginBottom: 12,
              lineHeight: 1,
              textShadow: '0 2px 16px rgba(0,0,0,0.9)',
            }}
          >
            {Number(score).toLocaleString()} pts
          </div>
        )}
        {rank && (
          <div
            style={{
              fontSize: 32,
              color: '#c4b5fd',
              marginBottom: 12,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            Rank #{rank} this week
          </div>
        )}
        <div
          style={{
            fontSize: 28,
            color: '#e5e7eb',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {subline}
        </div>
      </div>
    </div>
  );
};
