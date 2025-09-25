"use client";
import { ReactNode, useEffect, useState } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount } from "wagmi";

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

// Session token provider component
function SessionTokenProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Generate session token when wallet is connected
  useEffect(() => {
    const generateSessionToken = async () => {
      if (!address) {
        setSessionToken(null);
        return;
      }

      try {
        const response = await fetch('/api/session-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: address }),
        });

        if (!response.ok) {
          console.warn('Session token generation failed, using standard mode');
          setSessionToken(null);
          return;
        }

        const data = await response.json();
        setSessionToken(data.sessionToken);
      } catch (error) {
        console.warn('Session token generation failed, using standard mode:', error);
        setSessionToken(null);
      }
    };

    generateSessionToken();
  }, [address]);

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
      projectId="5b09d242-5390-4db3-866f-bfc2ce575821"
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
        fund: {
          sessionToken: sessionToken,
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
        <SessionTokenProvider>
          {children}
        </SessionTokenProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
