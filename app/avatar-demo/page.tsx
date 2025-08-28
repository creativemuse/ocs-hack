'use client';

import { Avatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import ActivePlayers from '@/components/game/ActivePlayers';
import PlayerCount from '@/components/game/PlayerCount';

export default function AvatarDemo() {
  const demoAddresses = [
    '0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9' as `0x${string}`, // Vitalik
    '0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF' as `0x${string}`, // Paul Cramer
    '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`, // Demo address
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Avatar Component Demo</h1>
        
        {/* Individual Avatar Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Individual Avatars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {demoAddresses.map((address, index) => (
              <div key={address} className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">
                  {index === 0 ? 'Vitalik' : index === 1 ? 'Paul Cramer' : 'Demo User'}
                </h3>
                <div className="flex items-center space-x-4">
                  <Avatar
                    address={address}
                    chain={base}
                    className="w-12 h-12 border-2 border-white/20 rounded-full"
                  />
                  <div>
                    <p className="text-sm text-gray-300">{address}</p>
                    <p className="text-xs text-gray-400">Base Chain</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Avatar with Custom Styling */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Custom Styled Avatars</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <Avatar
                address={demoAddresses[0]}
                chain={base}
                className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-2"
              />
              <p className="text-sm">Large Purple</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <Avatar
                address={demoAddresses[1]}
                chain={base}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mx-auto mb-2"
              />
              <p className="text-sm">Large Blue</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <Avatar
                address={demoAddresses[2]}
                chain={base}
                className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto mb-2"
              />
              <p className="text-sm">Large Green</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <Avatar
                address={"0x0000000000000000000000000000000000000000" as `0x${string}`}
                chain={base}
                className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mx-auto mb-2"
              />
              <p className="text-sm">Default Fallback</p>
            </div>
          </div>
        </section>

        {/* Active Players Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Active Players</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Players in this round</h3>
              <PlayerCount />
            </div>
            <div className="border-t border-gray-700 pt-4">
              <ActivePlayers maxPlayers={12} showTooltips={true} />
            </div>
          </div>
        </section>

        {/* Avatar Stack Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Avatar Stack</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center space-x-1">
              {demoAddresses.map((address, index) => (
                <div
                  key={address}
                  className="relative"
                  style={{ 
                    marginRight: index < demoAddresses.length - 1 ? '-8px' : '0',
                    zIndex: demoAddresses.length - index
                  }}
                >
                  <Avatar
                    address={address}
                    chain={base}
                    className="w-8 h-8 border-2 border-black rounded-full shadow-sm hover:scale-110 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Hover over avatars to see them scale up
            </p>
          </div>
        </section>

        {/* Usage Instructions */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Usage Instructions</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Basic Avatar</h3>
                <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`import { Avatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

<Avatar 
  address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9" 
  chain={base} 
/>`}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Custom Styling</h3>
                <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`<Avatar
  address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
  chain={base}
  className="w-12 h-12 border-2 border-white/20 rounded-full"
  defaultComponent={
    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
      VK
    </div>
  }
/>`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Active Players Component</h3>
                <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`import ActivePlayers from '@/components/game/ActivePlayers';

<ActivePlayers 
  maxPlayers={16} 
  showTooltips={true} 
/>`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
