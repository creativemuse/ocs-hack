// Farcaster MiniApp SDK type definitions
declare global {
  interface Window {
    sdk?: {
      actions?: {
        ready?: () => void;
      };
    };
  }
}

export {};

