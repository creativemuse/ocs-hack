"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create wagmi config
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'BEAT ME',
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

// Create query client
const queryClient = new QueryClient();

// OnchainKit provider component
function OnchainKitProviderWrapper({ children }: { children: ReactNode }) {

  useEffect(() => {
    type MiniAppSDK = { actions?: { ready?: () => void } };
    const maybeCallMiniAppReady = () => {
      try {
        const w = typeof window !== "undefined" ? (window as unknown as { sdk?: MiniAppSDK }) : undefined;
        const ready = w?.sdk?.actions?.ready;
        if (typeof ready === "function") ready();
      } catch {
        // no-op
      }
    };

    // Try after hydration
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(cb, 0);
    schedule(() => maybeCallMiniAppReady());

    // In case the SDK loads a bit later, poll briefly
    const intervalId = setInterval(maybeCallMiniAppReady, 500);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "5b09d242-5390-4db3-866f-bfc2ce575821"}
      config={{
        appearance: {
          name: "BEAT ME",
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
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
        <OnchainKitProviderWrapper>
          {children}
        </OnchainKitProviderWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
