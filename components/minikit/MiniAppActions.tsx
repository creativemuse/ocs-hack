"use client";
import { useAddFrame } from '@coinbase/onchainkit/minikit';

export function MiniAppActions() {
  const addFrame = useAddFrame();

  if (!addFrame) {
    return null;
  }

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-200">
      <button
        onClick={() => addFrame()}
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

