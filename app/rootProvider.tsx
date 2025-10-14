"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpacetimeProvider } from "@/components/providers/SpacetimeProvider";

// Create wagmi config with MiniKit support
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'BEAT ME',
      // Preference ensures smart wallet is default in Farcaster
      preference: 'smartWalletOnly',
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

// Create query client
const queryClient = new QueryClient();

// OnchainKit provider component
function OnchainKitProviderWrapper({ children }: { children: ReactNode }) {
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
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY}
      chain={base}
      projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "5b09d242-5390-4db3-866f-bfc2ce575821"}
      miniKit={{ enabled: true }}
      config={{
        // Paymaster configuration for sponsored transactions - matches OnchainKit docs
        paymaster: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT,
        appearance: {
          name: "BEAT ME",
          mode: "auto", // Change back to "auto" to allow theme switching
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
        // Disable analytics to prevent 401 errors
        analytics: false,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SpacetimeProvider>
          <OnchainKitProviderWrapper>
            {children}
          </OnchainKitProviderWrapper>
        </SpacetimeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
