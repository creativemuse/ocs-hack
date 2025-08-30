'use client';

interface GameTitleProps {
  className?: string;
}

export default function GameTitle({ className = '' }: GameTitleProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <h1 className="text-white text-5xl md:text-5xl lg:text-6xl font-audiowide font-bold tracking-wider mb-4 drop-shadow-lg">
        BEAT ME
      </h1>
      <p className="text-white/80 text-sm md:text-base font-medium max-w-xs leading-relaxed">
        Name that tune, win your reward.
      </p>
    </div>
  );
}
