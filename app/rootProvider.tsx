"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
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
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
