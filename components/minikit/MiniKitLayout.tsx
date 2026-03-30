"use client";
import { ReactNode, useEffect } from "react";
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniKitLayoutProps {
  children: ReactNode;
}

export function MiniKitLayout({ children }: MiniKitLayoutProps) {
  useEffect(() => {
    // Signal to Farcaster that the app is ready to display
    // This hides the loading splash screen
    sdk.actions.ready();
  }, []);

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

