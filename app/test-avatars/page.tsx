'use client';

import { Avatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import ActivePlayers from '@/components/game/ActivePlayers';
import PlayerCount from '@/components/game/PlayerCount';

export default function TestAvatars() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Avatar Test Page</h1>
        
        <div className="space-y-8">
          {/* Test 1: Basic Avatar */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test 1: Basic Avatar</h2>
            <Avatar 
              address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9" 
              chain={base}
              className="w-12 h-12"
            />
          </div>

          {/* Test 2: Active Players Component */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test 2: Active Players</h2>
            <ActivePlayers maxPlayers={8} showTooltips={true} />
          </div>

          {/* Test 3: Player Count */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test 3: Player Count</h2>
            <PlayerCount />
          </div>

          {/* Test 4: API Response */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test 4: API Status</h2>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/active-players');
                  const data = await response.json();
                  console.log('API Response:', data);
                  alert(`API working! Source: ${data.source}, Players: ${data.count}`);
                } catch (error) {
                  console.error('API Error:', error);
                  alert('API Error: ' + error);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
            >
              Test API
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
