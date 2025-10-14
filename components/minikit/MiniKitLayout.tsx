"use client";
import { ReactNode } from "react";

interface MiniKitLayoutProps {
  children: ReactNode;
}

export function MiniKitLayout({ children }: MiniKitLayoutProps) {
  // Simple wrapper for MiniApp context
  // TODO: Integrate proper MiniKit components when available in OnChainKit
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

