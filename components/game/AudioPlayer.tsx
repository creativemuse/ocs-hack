'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Play, Pause, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
  clipDurationSeconds?: number;
  clipStartSeconds?: number;
}

export default function AudioPlayer({ 
  audioUrl, 
  autoPlay = false, 
  onEnded, 
  onTimeUpdate,
  className = '',
  clipDurationSeconds = 10,
  clipStartSeconds = 0,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Ensure appropriate preload for quickest start
    audio.preload = 'auto';

    const handleTimeUpdate = (): void => {
      const t = Math.max(0, audio.currentTime - clipStartSeconds);
      setCurrentTime(t);
      // Emit a stable duration equal to the configured clip length to keep external timers in sync
      onTimeUpdate?.(t, clipDurationSeconds);
      if (t >= clipDurationSeconds) {
        audio.pause();
        setIsPlaying(false);
        onEnded?.();
      }
    };

    const handleDurationChange = (): void => {
      const total = isFinite(audio.duration) ? audio.duration : 0;
      const effective = Math.max(0, total - clipStartSeconds);
      setDuration(Math.max(0, Math.min(clipDurationSeconds, effective || clipDurationSeconds)));
    };

    const handleEnded = (): void => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleLoadedMetadata = (): void => {
      setIsMetadataLoaded(true);
      handleDurationChange();
      // Guard: only seek once metadata is known
      if (!Number.isNaN(clipStartSeconds) && clipStartSeconds > 0 && isFinite(audio.duration)) {
        try {
          audio.currentTime = Math.min(Math.max(0, clipStartSeconds), audio.duration || clipStartSeconds);
        } catch {}
      }
      if (autoPlay) {
        void tryAutoplay();
      } else {
        setIsLoading(false);
      }
    };

    const handleLoadedData = (): void => {
      setHasError(false);
    };

    const handleCanPlay = (): void => {
      setIsLoading(false);
    };

    const handleError = (): void => {
      setIsLoading(false);
      setHasError(true);
      console.error('Audio failed to load:', audioUrl);
    };

    const tryAutoplay = async (): Promise<void> => {
      try {
        await audio.play();
        setIsPlaying(true);
        setAutoplayBlocked(false);
      } catch {
        // Autoplay blocked; wait for first user gesture to start playback
        setAutoplayBlocked(true);
        const resumeOnGesture = async () => {
          try {
            await audio.play();
            setIsPlaying(true);
            setAutoplayBlocked(false);
          } catch {}
        };
        const onceOpts: AddEventListenerOptions | boolean = { once: true } as AddEventListenerOptions;
        window.addEventListener('pointerdown', resumeOnGesture, onceOpts);
        window.addEventListener('touchstart', resumeOnGesture, onceOpts);
        window.addEventListener('keydown', resumeOnGesture, onceOpts);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, autoPlay, onEnded, onTimeUpdate, clipDurationSeconds, clipStartSeconds]);

  const togglePlayPause = (): void => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayBlocked(false);
        // If user explicitly plays, ensure unmuted
        if (audio.muted) {
          audio.muted = false;
          setIsMuted(false);
        }
      })
      .catch((error) => {
        console.error('Failed to play audio:', error);
        setAutoplayBlocked(true);
      });
  };

  const toggleMute = (): void => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !isMuted;
    audio.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (_newVolume: number[]): void => {
    const audio = audioRef.current;
    const volumeValue = _newVolume[0]! / 100;
    
    if (audio) {
      audio.volume = volumeValue;
      if (volumeValue > 0 && audio.muted) {
        audio.muted = false;
        setIsMuted(false);
      }
    }
    setVolume(volumeValue);
    
    if (volumeValue === 0 && !isMuted) {
      setIsMuted(true);
    } else if (volumeValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (_newValue: number[]): void => {
    const audio = audioRef.current;
    if (!audio || duration === 0 || !isMetadataLoaded) return;
    const percentage = _newValue[0]! / 100;
    const newTime = clipStartSeconds + percentage * duration;
    try {
      audio.currentTime = newTime;
      setCurrentTime(Math.max(0, audio.currentTime - clipStartSeconds));
    } catch {}
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg`}>
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-red-700 text-sm">Audio file not found</span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
      />
      
      <div className="flex items-center space-x-4">
        {/* Play/Pause Button */}
        <Button
          onClick={togglePlayPause}
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 hidden"
          disabled={isLoading || hasError}
        >
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-1" />
          )}
        </Button>

        {/* Progress Bar + Seek */}
        <div className="flex-1">
          <Slider
            value={[progressPercentage]}
            onValueChange={handleSeek}
            className="w-full hidden"
            disabled={isLoading || hasError}
          />
          <div className="flex justify-between text-sm text-white mt-1 hidden">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {autoplayBlocked && (
            <div className="text-xs text-orange-400 mt-1">Tap to start audio</div>
          )}
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2 w-32">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-white/10 hidden"
            disabled={isLoading || hasError}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[Math.round(volume * 100)]}
            onValueChange={handleVolumeChange}
            className="w-full hidden"
            disabled={isLoading || hasError}
          />
        </div>
      </div>

      {/* Waveform Visual (Simulated) */}
      <div className="mt-4 h-8 flex items-end justify-center space-x-1">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className={`w-1 bg-gradient-to-t from-blue-400 to-purple-400 rounded-sm transition-all duration-75 ${
              isPlaying ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${Math.random() * 100 + 10}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}