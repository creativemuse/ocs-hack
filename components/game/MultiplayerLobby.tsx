'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LOBBY_MUSIC } from '@/lib/config/lobbyMusic';
import type { GameSession } from '@/hooks/useGameSession';
import { Users, Link2, Copy, Music } from 'lucide-react';

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
  const [displaySec, setDisplaySec] = useState(lobbyTimeRemaining);
  const [copied, setCopied] = useState(false);
  const syncedDurationRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      void refetch();
    }, 2000);
    return () => clearInterval(id);
  }, [refetch]);

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

  useEffect(() => {
    setDisplaySec(lobbyTimeRemaining);
  }, [lobbyTimeRemaining]);

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
      void onEndLobbyEarly();
    };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [onEndLobbyEarly, onSyncDuration]);

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
              Strangers in the pool can join you. Share the link with a friend. When the lobby music ends (or the
              timer hits zero), everyone in the lobby starts together.
              {soloLabel && paidPlayers.length === 1 ? ' One player counts as solo for this round.' : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-lg border border-white/10 bg-white/5 p-4 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="text-3xl font-mono tabular-nums text-amber-200">{displaySec}s</div>
              <div className="text-xs text-zinc-500 mt-1">Lobby time (synced with track when playing)</div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/50 p-3">
              <Music className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" aria-hidden />
              <div className="text-left text-sm">
                <div className="text-white font-medium">{LOBBY_MUSIC.title}</div>
                <div className="text-zinc-400">
                  {LOBBY_MUSIC.artist} · {LOBBY_MUSIC.album}
                </div>
                <a
                  href={LOBBY_MUSIC.albumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/90 hover:text-amber-300 text-xs underline mt-1 inline-block"
                >
                  Listen / album link
                </a>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={LOBBY_MUSIC.src}
              preload="auto"
              className="w-full"
              controls
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
