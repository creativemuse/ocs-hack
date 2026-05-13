"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function MiniAppActions() {
  const [isInFarcaster, setIsInFarcaster] = useState(false);

  useEffect(() => {
    setIsInFarcaster(
      typeof window !== 'undefined' &&
      !!window.sdk?.actions
    );
  }, []);

  if (!isInFarcaster) {
    return null;
  }

  const handleAddFrame = async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      console.error('Failed to add frame:', error);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-200">
      <button
        onClick={handleAddFrame}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 font-semibold"
      >
        <span>📌</span>
        <span>Add to Farcaster</span>
      </button>
      <p className="text-xs text-center text-gray-600 mt-2">
        Pin this game to your Farcaster for quick access!
      </p>
    </div>
  );
}
