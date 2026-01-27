"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, baseAccount } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpacetimeProvider } from "@/components/providers/SpacetimeProvider";

// Get RPC URL for wagmi config
// IMPORTANT: Use public RPC for general wagmi operations
// The CDP authenticated endpoint is only for bundler/paymaster operations
// Using it for general RPC calls causes 401 errors
const getBaseRpcUrl = () => {
  // Always use public RPC for wagmi general operations
  // The authenticated CDP endpoint should only be used for bundler/paymaster
  const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;

  // Only use public endpoints (not authenticated CDP endpoints)
  if (baseRpcUrl && !baseRpcUrl.includes('api.developer.coinbase.com')) {
    return baseRpcUrl;
  }

  // Fallback to public Base RPC endpoint
  return 'https://mainnet.base.org';
};

// Create wagmi config with MiniKit and Base Account support
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Base Account connector for existing Base users
    baseAccount({
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'BEAT ME',
    }),
    // Coinbase Wallet connector (includes embedded wallets via OnchainKit)
    coinbaseWallet({
      appName: 'BEAT ME',
      // Preference ensures smart wallet is default in Farcaster
      preference: 'smartWalletOnly',
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(getBaseRpcUrl()),
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
        appearance: {
          name: "BEAT ME",
          mode: "auto", // Change back to "auto" to allow theme switching
          logo: "/logo.png",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
        // Disable analytics to prevent 401 errors
        analytics: false,
        // Paymaster configuration - using the CDP paymaster URL
        paymaster: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT?.startsWith('http')
          ? process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT
          : undefined,
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
