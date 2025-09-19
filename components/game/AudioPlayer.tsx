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
  onError?: () => void;
  className?: string;
  clipDurationSeconds?: number;
  clipStartSeconds?: number;
}

export default function AudioPlayer({ 
  audioUrl, 
  autoPlay = false, 
  onEnded, 
  onTimeUpdate,
  onError,
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
  const [retryCount, setRetryCount] = useState(0);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const maxRetries = 3;
  const maxGateways = 9;

  // Function to try different IPFS gateways
  const tryDifferentGateway = (url: string): string => {
    const gateways = [
      "https://gateway.lighthouse.storage/ipfs",
      "https://ipfs.io/ipfs",
      "https://dweb.link/ipfs",
      "https://storry.tv/ipfs",
      "https://trustless-gateway.link/ipfs",
      "https://4everland.io/ipfs",
      "https://w3s.link/ipfs",
      "https://nftstorage.link/ipfs",
      "https://gateway.pinata.cloud/ipfs"
    ];
    
    // Extract CID from current URL - handle both filename and CID patterns
    let cid = '';
    if (url.includes('/ipfs/')) {
      const parts = url.split('/ipfs/');
      cid = parts[1]?.split('/')[0] || '';
    } else {
      const fileName = url.split('/').pop();
      if (!fileName) return url;
      cid = fileName;
    }
    
    if (!cid) return url;
    
    // Use next gateway
    const nextGateway = gateways[gatewayIndex + 1] || gateways[0];
    return `${nextGateway}/${cid}`;
  };

  // Function to get local fallback URL
  const getLocalFallbackUrl = (url: string): string | null => {
    const fileName = url.split('/').pop();
    if (!fileName) return null;
    
    // Always try local fallback first for any .mp3 file
    if (fileName.endsWith('.mp3')) {
      return `/music/${fileName}`;
    }
    
    return null;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🔊 AudioPlayer useEffect triggered for URL:', audioUrl);

    // Reset retry count and gateway index when URL changes
    setRetryCount(0);
    setGatewayIndex(0);
    setUseLocalFallback(false);
    setHasError(false);
    setIsLoading(true);
    setAutoplayBlocked(false);
    setIsMetadataLoaded(false);

    // Ensure appropriate preload for quickest start
    audio.preload = 'auto';
    
    // Test CORS preflight for debugging
    if (audioUrl && audioUrl.startsWith('https://')) {
      fetch(audioUrl, { method: 'HEAD' })
        .then(response => {
          console.log('✅ CORS preflight successful:', response.status, response.headers.get('content-type'));
        })
        .catch(error => {
          console.warn('⚠️ CORS preflight failed:', error.message);
        });
    }

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
      console.log('🔊 Audio metadata loaded:', {
        url: audioUrl,
        duration: audio.duration,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
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
      
      // Log additional debugging information
      console.log('🔊 Audio error details:', {
        url: audioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState,
        error: audio.error?.code,
        errorMessage: audio.error?.message,
        src: audio.src,
        currentSrc: audio.currentSrc
      });
      
      // Try local fallback first (faster and more reliable)
      if (!useLocalFallback) {
        console.log('Trying local fallback...');
        setUseLocalFallback(true);
        setRetryCount(0);
        setHasError(false);
        setIsLoading(true);
        
        // Try local file
        setTimeout(() => {
          if (audio) {
            const localUrl = getLocalFallbackUrl(audioUrl);
            if (localUrl) {
              console.log(`Using local fallback: ${localUrl}`);
              audio.src = localUrl;
              audio.load();
            } else {
              // No local fallback available, try different gateway
              if (gatewayIndex < maxGateways - 1) {
                console.log(`Trying different gateway (${gatewayIndex + 1}/${maxGateways})...`);
                setGatewayIndex(prev => prev + 1);
                const newUrl = tryDifferentGateway(audioUrl);
                audio.src = newUrl;
                audio.load();
              } else {
                setRetryCount(prev => prev + 1);
                audio.load();
              }
            }
          }
        }, 500);
      }
      // Try different gateway if local fallback failed
      else if (gatewayIndex < maxGateways - 1) {
        console.log(`Trying different gateway (${gatewayIndex + 1}/${maxGateways})...`);
        setGatewayIndex(prev => prev + 1);
        setRetryCount(0);
        setHasError(false);
        setIsLoading(true);
        
        // Update audio source with new gateway
        setTimeout(() => {
          if (audio) {
            const newUrl = tryDifferentGateway(audioUrl);
            audio.src = newUrl;
            audio.load();
          }
        }, 500);
      }
      // Then try retries with same source
      else if (retryCount < maxRetries) {
        console.log(`Retrying audio load (${retryCount + 1}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
        
        // Reset audio element and retry
        setTimeout(() => {
          if (audio) {
            audio.load();
          }
        }, 1000);
      } else {
        setHasError(true);
        console.error('🔊 Audio failed to load after all retries:', audioUrl);
        // Try one final fallback to local file
        const localUrl = getLocalFallbackUrl(audioUrl);
        if (localUrl && localUrl !== audioUrl) {
          console.log('🔊 Final attempt with local fallback:', localUrl);
          setTimeout(() => {
            if (audio) {
              audio.src = localUrl;
              audio.load();
            }
          }, 1000);
        } else {
          // Notify parent component about the error
          onError?.();
        }
      }
    };

    const tryAutoplay = async (): Promise<void> => {
      try {
        console.log('🔊 Attempting autoplay for:', audioUrl);
        await audio.play();
        console.log('🔊 Autoplay successful');
        setIsPlaying(true);
        setAutoplayBlocked(false);
      } catch (error) {
        console.log('🔊 Autoplay blocked, waiting for user gesture:', error);
        // Autoplay blocked; wait for first user gesture to start playback
        setAutoplayBlocked(true);
        const resumeOnGesture = async () => {
          try {
            console.log('🔊 User gesture detected, resuming playback');
            await audio.play();
            setIsPlaying(true);
            setAutoplayBlocked(false);
          } catch (gestureError) {
            console.log('🔊 Failed to play after user gesture:', gestureError);
          }
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
        <div className="text-red-700 text-sm">
          <div>Audio file not found</div>
          {retryCount > 0 && (
            <div className="text-xs text-red-500 mt-1">
              Retried {retryCount} times
            </div>
          )}
          {useLocalFallback && (
            <div className="text-xs text-blue-500 mt-1">
              Tried local fallback
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        crossOrigin="anonymous"
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
            <div className="text-center mt-2">
              <button
                onClick={togglePlayPause}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                🔊 Tap to Play Audio
              </button>
            </div>
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