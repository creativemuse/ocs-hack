"use client";
import { ReactNode, useEffect, useState } from "react";
import { base } from "viem/chains";
import { createBaseAccountSDK } from "@base-org/account";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpacetimeProvider } from "@/components/providers/SpacetimeProvider";

// Create query client
const queryClient = new QueryClient();

// Base Account provider component
function BaseAccountProviderWrapper({ children }: { children: ReactNode }) {
  const [baseAccountSDK, setBaseAccountSDK] = useState<any>(null);

  // Initialize Base Account SDK client-side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'BEAT ME',
          appLogoUrl: 'https://base.org/logo.png',
          appChainIds: [base.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          },
          paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
        });
        setBaseAccountSDK(sdk);
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  // Call ready() as early as possible to prevent jitter and content reflows
  useEffect(() => {
    // Safely check if Farcaster miniapp SDK is available
    if (typeof window !== "undefined" && window.sdk?.actions?.ready) {
      console.log('[Farcaster] SDK detected, calling ready()');
      window.sdk.actions.ready();
      console.log('[Farcaster] ready() called successfully');
    } else {
      console.log('[Farcaster] SDK not available:', {
        hasWindow: typeof window !== "undefined",
        hasSdk: typeof window !== "undefined" && !!window.sdk,
        hasActions: typeof window !== "undefined" && !!window.sdk?.actions,
        hasReady: typeof window !== "undefined" && typeof window.sdk?.actions?.ready === 'function'
      });
    }
  }, []);
  
  return <>{children}</>;
}

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SpacetimeProvider>
        <BaseAccountProviderWrapper>
          {children}
        </BaseAccountProviderWrapper>
      </SpacetimeProvider>
    </QueryClientProvider>
  );
}
