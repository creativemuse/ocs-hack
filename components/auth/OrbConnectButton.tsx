'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Link2, Unlink } from 'lucide-react';
import { useOrbAuth } from '@/components/providers/OrbAuthProvider';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';

type OrbConnectButtonProps = {
  className?: string;
  compact?: boolean;
};

export default function OrbConnectButton({
  className = '',
  compact = false,
}: OrbConnectButtonProps) {
  const { isConnected } = useBaseAccount();
  const {
    session,
    linkedProfile,
    isConnecting,
    isLinking,
    error,
    connectWithQr,
    linkToWallet,
    disconnect,
    clearError,
  } = useOrbAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const autoLinkAttemptedRef = useRef<string | null>(null);

  const handleOpenDialog = () => {
    clearError();
    setDialogOpen(true);
    if (!session && !isConnecting) {
      handleConnect();
    }
  };

  const handleConnect = async () => {
    autoLinkAttemptedRef.current = null;
    try {
      await connectWithQr(({ qrCode: code, deepLink: link }) => {
        setQrCode(code);
        setDeepLink(link ?? null);
      });
    } catch {
      // error surfaced via context
    }
  };

  const handleLink = async () => {
    const profile = await linkToWallet();
    if (profile) {
      setDialogOpen(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen || !session?.accessToken || linkedProfile || isLinking || isConnecting) {
      return;
    }

    if (autoLinkAttemptedRef.current === session.accessToken) {
      return;
    }

    autoLinkAttemptedRef.current = session.accessToken;

    const runAutoLink = async () => {
      const profile = await linkToWallet();
      if (profile) {
        setDialogOpen(false);
      }
    };

    void runAutoLink();
  }, [dialogOpen, session?.accessToken, linkedProfile, isLinking, isConnecting, linkToWallet]);

  if (!isConnected) {
    return null;
  }

  if (linkedProfile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <PlayerAvatar
          walletAddress={undefined}
          username={`@${linkedProfile.handle}`}
          avatarUrl={linkedProfile.avatarUrl}
          className="w-8 h-8"
        />
        {!compact && (
          <span className="text-sm text-white/90">@{linkedProfile.handle}</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="text-white/60 hover:text-white"
          aria-label="Disconnect Orb profile"
        >
          <Unlink className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const showManualLink = session && !linkedProfile && !isLinking && error;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpenDialog}
        className={`border-purple-500/50 text-purple-200 hover:bg-purple-500/10 ${className}`}
        aria-label="Connect Orb profile"
      >
        {isConnecting || isLinking ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Link2 className="w-4 h-4 mr-2" />
        )}
        {compact ? 'Orb' : 'Link Orb Profile'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-black border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Orb / Lens</DialogTitle>
            <DialogDescription className="text-gray-400">
              Scan with the Orb app to link your Lens handle and avatar to Beat Me.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {qrCode ? (
              <Image
                src={qrCode}
                alt="Orb sign-in QR code"
                width={220}
                height={220}
                className="rounded-lg border border-gray-700"
                unoptimized
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-900 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            )}

            {deepLink && (
              <a
                href={deepLink}
                className="text-sm text-purple-300 hover:text-purple-200 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Orb app
              </a>
            )}

            {isLinking && (
              <p className="text-sm text-purple-200 text-center">
                Linking your Orb profile to your Base wallet…
              </p>
            )}

            {showManualLink && (
              <Button
                type="button"
                onClick={handleLink}
                disabled={isLinking}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                aria-label="Retry linking Orb profile to Base wallet"
              >
                Retry link to Base wallet
              </Button>
            )}

            {error && (
              <p className="text-sm text-red-400 text-center" role="alert">
                {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
