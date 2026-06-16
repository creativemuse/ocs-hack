"use client";

import { ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpacetimeProvider } from "@/components/providers/SpacetimeProvider";
import { BaseAccountProvider } from "@/components/providers/BaseAccountProvider";
import { OrbAuthProvider } from "@/components/providers/OrbAuthProvider";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

function FarcasterReadyEffect() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.sdk?.actions?.ready) {
      window.sdk.actions.ready();
    }
  }, []);

  return null;
}

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SpacetimeProvider>
          <BaseAccountProvider>
            <OrbAuthProvider>
              <FarcasterReadyEffect />
              {children}
            </OrbAuthProvider>
          </BaseAccountProvider>
        </SpacetimeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
