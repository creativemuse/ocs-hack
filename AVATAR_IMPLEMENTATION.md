# Avatar Implementation for BEAT ME Game

This document describes the implementation of the OnchainKit Avatar component to display active players in the BEAT ME game.

## Overview

The implementation uses the `@coinbase/onchainkit/identity` Avatar component to display ENS and Basename avatars for Ethereum addresses. When no avatar is available, it falls back to a custom gradient avatar with the player's initials.

## Components Created

### 1. ActivePlayers Component (`components/game/ActivePlayers.tsx`)

A reusable component that displays a stack of active player avatars with hover tooltips.

**Features:**
- Fetches active players from the API
- Displays up to 16 players in a stacked layout
- Hover tooltips showing player details
- Fallback to demo players if API fails
- Auto-refresh every 30 seconds

**Props:**
- `maxPlayers`: Maximum number of players to display (default: 16)
- `showTooltips`: Whether to show hover tooltips (default: true)
- `className`: Additional CSS classes

**Usage:**
```tsx
import ActivePlayers from '@/components/game/ActivePlayers';

<ActivePlayers maxPlayers={16} showTooltips={true} />
```

### 2. PlayerCount Component (`components/game/PlayerCount.tsx`)

A simple component that displays the count of active players.

**Props:**
- `showLabel`: Whether to show "Players:" label (default: true)
- `className`: Additional CSS classes

**Usage:**
```tsx
import PlayerCount from '@/components/game/PlayerCount';

<PlayerCount showLabel={false} />
```

### 3. useActivePlayers Hook (`hooks/useActivePlayers.ts`)

A custom hook that manages active players data with caching and auto-refresh.

**Options:**
- `maxPlayers`: Maximum number of players to fetch (default: 16)
- `refreshInterval`: Refresh interval in milliseconds (default: 30000)
- `autoRefresh`: Whether to auto-refresh (default: true)

**Returns:**
- `players`: Array of active players
- `isLoading`: Loading state
- `error`: Error state
- `refetch`: Function to manually refetch data

**Usage:**
```tsx
import { useActivePlayers } from '@/hooks/useActivePlayers';

const { players, isLoading, error, refetch } = useActivePlayers({
  maxPlayers: 16,
  refreshInterval: 30000,
  autoRefresh: true
});
```

## API Endpoint

### Active Players API (`app/api/active-players/route.ts`)

Fetches recent players from the database and returns them in a format suitable for the Avatar components.

**Response:**
```json
{
  "players": [
    {
      "address": "0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9",
      "username": "VITALIK.BASE.ETH",
      "avatarUrl": null,
      "totalScore": 850,
      "gamesPlayed": 12,
      "isWalletUser": true,
      "lastActive": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

## Avatar Component Usage

### Basic Avatar
```tsx
import { Avatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

<Avatar 
  address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9" 
  chain={base} 
/>
```

### Custom Styled Avatar
```tsx
<Avatar
  address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
  chain={base}
  className="w-12 h-12 border-2 border-white/20 rounded-full"
  defaultComponent={
    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
      VK
    </div>
  }
/>
```

### Avatar Stack
```tsx
<div className="flex items-center space-x-1">
  {players.map((player, index) => (
    <div
      key={player.address}
      className="relative"
      style={{ 
        marginRight: index < players.length - 1 ? '-8px' : '0',
        zIndex: players.length - index
      }}
    >
      <Avatar
        address={player.address}
        chain={base}
        className="w-5 h-5 border-2 border-black rounded-full shadow-sm hover:scale-110 transition-transform duration-200"
      />
    </div>
  ))}
</div>
```

## Integration in Game Page

The Avatar components have been integrated into the game page (`app/game/page.tsx`) to replace the static player icons:

1. **Active Players Display**: Shows up to 16 active players in a stacked layout
2. **Player Count**: Displays the number of active players
3. **Hover Tooltips**: Show player details on hover

## Demo Page

A demo page has been created at `/avatar-demo` to showcase all Avatar component features and usage examples.

## Features

### ✅ Implemented
- [x] OnchainKit Avatar component integration
- [x] ENS and Basename avatar support
- [x] Custom fallback avatars with gradients
- [x] Active players API endpoint
- [x] Hover tooltips with player details
- [x] Auto-refresh functionality
- [x] Fallback to demo players
- [x] Responsive design
- [x] Loading states
- [x] Error handling

### 🔄 Auto-refresh
- Players list refreshes every 30 seconds
- Player count updates automatically
- Smooth loading transitions

### 🎨 Styling
- Consistent with game design
- Hover effects and animations
- Responsive layout
- Dark theme compatible

## Dependencies

- `@coinbase/onchainkit`: For Avatar components
- `viem`: For blockchain chain definitions
- `@tanstack/react-query`: For data fetching (optional, can be replaced with fetch)

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live player updates
2. **Player Status**: Online/offline indicators
3. **Avatar Caching**: Cache avatars to reduce API calls
4. **Custom Avatars**: Allow players to upload custom avatars
5. **Avatar Badges**: Show achievements or status badges
6. **Player Profiles**: Click to view detailed player profiles

## Setup Instructions

### 1. Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
```

### 2. Database Setup

Run the complete database setup script in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `setup_database_complete.sql`
4. Execute the script

This will create all necessary tables and insert sample data.

### 3. Verify Setup

Test the setup by visiting:
- `/test-avatars` - Test page for Avatar components
- `/avatar-demo` - Demo page showcasing all features
- `/api/env-check` - Check environment configuration
- `/api/active-players` - Test the active players API

## Troubleshooting

### Common Issues

1. **Avatars not loading**: Check if OnchainKit is properly configured
2. **API errors**: Verify Supabase connection and database tables
3. **Styling issues**: Ensure Tailwind CSS is properly configured
4. **Demo data showing**: This is normal if database tables don't exist yet

### Debug Mode

Enable debug logging by setting `console.log` statements in the components to track data flow and identify issues.

### API Response Sources

The API returns different sources based on the state:
- `database`: Real data from Supabase
- `demo`: Demo data (Supabase not configured)
- `demo-fallback`: Demo data (database error)
- `demo-no-data`: Demo data (no players found)
- `demo-error`: Demo data (unexpected error)
