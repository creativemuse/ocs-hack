'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LOBBY_MUSIC } from '@/lib/config/lobbyMusic';
import type { GameSession } from '@/hooks/useGameSession';
import { Users, Link2, Copy, Music, Volume2, VolumeX } from 'lucide-react';

type MultiplayerLobbyProps = {
  session: GameSession | null;
  lobbyTimeRemaining: number;
  inviteUrl: string;
  onRoundStart: () => void;
  onLeaveLobby: () => Promise<void>;
  onEndLobbyEarly: () => Promise<void>;
  onSyncDuration: (sec: number) => Promise<void>;
  refetch: () => Promise<void>;
};

const formatAddr = (id: string, wallet?: string) => {
  const w = wallet || id;
  if (w.startsWith('0x') && w.length > 10) {
    return `${w.slice(0, 6)}…${w.slice(-4)}`;
  }
  return w.length > 14 ? `${w.slice(0, 10)}…` : w;
};

const BAR_COUNT = 32;

export default function MultiplayerLobby({
  session,
  lobbyTimeRemaining,
  inviteUrl,
  onRoundStart,
  onLeaveLobby,
  onEndLobbyEarly,
  onSyncDuration,
  refetch,
}: MultiplayerLobbyProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const [displaySec, setDisplaySec] = useState(lobbyTimeRemaining);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const syncedDurationRef = useRef(false);

  // Poll session state
  useEffect(() => {
    const id = setInterval(() => {
      void refetch();
    }, 2000);
    return () => clearInterval(id);
  }, [refetch]);

  // Track lobby seen for auto-transition
  const lobbySeenRef = useRef(false);
  useEffect(() => {
    if (session?.status === 'lobby') {
      lobbySeenRef.current = true;
    }
  }, [session?.status]);

  useEffect(() => {
    if (session?.status === 'active' && lobbySeenRef.current) {
      lobbySeenRef.current = false;
      onRoundStart();
    }
  }, [session?.status, onRoundStart]);

  // Sync display timer from backend
  useEffect(() => {
    setDisplaySec(lobbyTimeRemaining);
  }, [lobbyTimeRemaining]);

  // Setup Web Audio API analyser + frequency visualizer
  const initAudioContext = useCallback(() => {
    const el = audioRef.current;
    if (!el || audioCtxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    const source = ctx.createMediaElementSource(el);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  // Draw frequency bars on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      if (!analyser || !isPlaying) {
        // Draw idle bars
        const barW = w / BAR_COUNT - 2;
        for (let i = 0; i < BAR_COUNT; i++) {
          const idleH = 2 + Math.sin(Date.now() / 600 + i * 0.3) * 3;
          const x = i * (barW + 2);
          const gradient = ctx2d.createLinearGradient(x, h, x, h - idleH);
          gradient.addColorStop(0, 'rgba(168,85,247,0.4)');
          gradient.addColorStop(1, 'rgba(236,72,153,0.4)');
          ctx2d.fillStyle = gradient;
          ctx2d.fillRect(x, h - idleH, barW, idleH);
        }
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);

      const barW = w / BAR_COUNT - 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const dataIdx = Math.floor((i / BAR_COUNT) * bufLen);
        const val = data[dataIdx] ?? 0;
        const barH = Math.max(2, (val / 255) * h);
        const x = i * (barW + 2);

        const gradient = ctx2d.createLinearGradient(x, h, x, h - barH);
        gradient.addColorStop(0, 'rgba(168,85,247,0.9)');
        gradient.addColorStop(1, 'rgba(236,72,153,0.9)');
        ctx2d.fillStyle = gradient;
        ctx2d.fillRect(x, h - barH, barW, barH);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // Audio events: sync duration, update timer display, handle end
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onMeta = () => {
      if (syncedDurationRef.current) return;
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) {
        syncedDurationRef.current = true;
        const sec = Math.min(600, Math.max(30, Math.ceil(d)));
        void onSyncDuration(sec);
      }
    };

    const onTime = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      const left = Math.max(0, Math.ceil(el.duration - el.currentTime));
      setDisplaySec(left);
    };

    const onEnded = () => {
      setIsPlaying(false);
      void onEndLobbyEarly();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [onEndLobbyEarly, onSyncDuration]);

  // Auto-play on mount
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const tryPlay = async () => {
      try {
        initAudioContext();
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        await el.play();
        setIsPlaying(true);
        setAutoplayBlocked(false);
      } catch {
        setAutoplayBlocked(true);
      }
    };

    if (el.readyState >= 2) {
      void tryPlay();
    } else {
      const onCanPlay = () => {
        void tryPlay();
        el.removeEventListener('canplay', onCanPlay);
      };
      el.addEventListener('canplay', onCanPlay);
      return () => el.removeEventListener('canplay', onCanPlay);
    }
  }, [initAudioContext]);

  // Resume on user gesture if autoplay was blocked
  useEffect(() => {
    if (!autoplayBlocked) return;

    const resume = async () => {
      const el = audioRef.current;
      if (!el) return;
      try {
        initAudioContext();
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        await el.play();
        setIsPlaying(true);
        setAutoplayBlocked(false);
      } catch { /* still blocked */ }
    };

    const opts: AddEventListenerOptions = { once: true };
    window.addEventListener('pointerdown', resume, opts);
    window.addEventListener('touchstart', resume, opts);
    window.addEventListener('keydown', resume, opts);
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('touchstart', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [autoplayBlocked, initAudioContext]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = '';
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  const handleMuteToggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleTapToPlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      initAudioContext();
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      await el.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch { /* blocked */ }
  }, [initAudioContext]);

  const handleCopyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [inviteUrl]);

  const paidPlayers = (session?.players ?? []).filter((p) => p.isPaidPlayer);
  const soloLabel = paidPlayers.length <= 1;

  const fmtTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-zinc-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Users className="h-5 w-5 text-amber-400" />
              Multiplayer lobby
            </CardTitle>
            <p className="text-sm text-zinc-400">
              Strangers in the pool can join you. Share the link with a friend. When the lobby music ends,
              everyone in the lobby starts together.
              {soloLabel && paidPlayers.length === 1 ? ' One player counts as solo for this round.' : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Timer display */}
            <div
              className="rounded-lg border border-white/10 bg-white/5 p-4 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="text-4xl font-mono tabular-nums text-amber-200 tracking-wider">
                {fmtTimer(displaySec)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Countdown synced to lobby track</div>
            </div>

            {/* Music visualizer + track info */}
            <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-amber-400" aria-hidden />
                  <div className="text-sm">
                    <span className="text-white font-medium">{LOBBY_MUSIC.title}</span>
                    <span className="text-zinc-500"> · </span>
                    <span className="text-zinc-400">{LOBBY_MUSIC.artist}</span>
                  </div>
                </div>
                <button
                  onClick={handleMuteToggle}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-amber-400" />
                  )}
                </button>
              </div>

              <canvas
                ref={canvasRef}
                width={360}
                height={48}
                className="w-full h-12 rounded"
              />

              {/* Progress bar */}
              {audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0 && (
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                    style={{
                      width: `${Math.min(100, ((audioRef.current.currentTime || 0) / audioRef.current.duration) * 100)}%`,
                    }}
                  />
                </div>
              )}

              {autoplayBlocked && (
                <button
                  onClick={handleTapToPlay}
                  className="w-full py-2 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-medium transition-colors"
                >
                  Tap to start lobby music
                </button>
              )}

              <a
                href={LOBBY_MUSIC.albumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400/70 hover:text-amber-300 text-xs underline inline-block"
              >
                {LOBBY_MUSIC.album}
              </a>
            </div>

            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={LOBBY_MUSIC.src}
              preload="auto"
              aria-label="Lobby music"
            />

            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Invite a friend</div>
              <div className="flex gap-2">
                <div className="flex-1 truncate rounded border border-white/10 bg-black/40 px-2 py-2 text-xs text-zinc-300">
                  {inviteUrl}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInvite}
                  className="shrink-0 border-amber-500/40 text-amber-200"
                  aria-label="Copy invite link"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Anyone with the link can join this pool as a paid multiplayer player while the lobby is open.
              </p>
            </div>

            <div>
              <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Paid players in this lobby
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {paidPlayers.length === 0 ? (
                  <li className="text-zinc-500 text-sm">Waiting for players…</li>
                ) : (
                  paidPlayers.map((p) => (
                    <li key={p.id} className="text-sm text-zinc-200 font-mono">
                      {formatAddr(p.id, p.walletAddress)}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-zinc-400 hover:text-white"
              onClick={() => void onLeaveLobby()}
            >
              Leave lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
