-- Complete Database Setup Script for BEATME trivia game
-- Run this in your Supabase SQL Editor

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  trial_games_remaining INTEGER DEFAULT 1,
  trial_completed BOOLEAN DEFAULT FALSE,
  wallet_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_address TEXT, -- Can be NULL for anonymous sessions
  session_id TEXT, -- For anonymous players
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_score INTEGER DEFAULT 0,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'completed',
  questions_data JSONB,
  answers_data JSONB,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  prize_claimed BOOLEAN DEFAULT FALSE,
  claim_transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create anonymous_sessions table
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  games_played INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prize_pools table
CREATE TABLE IF NOT EXISTS prize_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  entry_fee DECIMAL(10,2) DEFAULT 1.00,
  paid_players INTEGER DEFAULT 0,
  free_players INTEGER DEFAULT 0,
  winner_address TEXT,
  winner_score INTEGER,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create pending_claims table
CREATE TABLE IF NOT EXISTS pending_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  wallet_address TEXT,
  game_id TEXT NOT NULL,
  prize_amount DECIMAL(10,2) NOT NULL,
  score INTEGER NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claim_transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Disable RLS for development (we can enable it later with proper policies)
ALTER TABLE IF EXISTS players DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anonymous_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prize_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_claims DISABLE ROW LEVEL SECURITY;

-- Insert some sample data for testing
INSERT INTO players (wallet_address, username, total_score, games_played, best_score) VALUES
  ('0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9', 'VITALIK.BASE.ETH', 850, 12, 150),
  ('0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF', 'PAULCRAMER.BASE.ETH', 720, 8, 120),
  ('0x1234567890abcdef1234567890abcdef12345678', 'ALICE.BASE.ETH', 650, 15, 95),
  ('0xabcdef1234567890abcdef1234567890abcdef12', 'BOB.BASE.ETH', 420, 6, 80),
  ('0x9876543210fedcba9876543210fedcba98765432', 'CHARLIE.BASE.ETH', 980, 20, 180)
ON CONFLICT (wallet_address) DO UPDATE SET
  updated_at = NOW();

-- Insert sample anonymous sessions
INSERT INTO anonymous_sessions (session_id, games_played, total_score, best_score) VALUES
  ('anon-session-001', 3, 150, 75),
  ('anon-session-002', 2, 90, 45),
  ('anon-session-003', 5, 280, 120)
ON CONFLICT (session_id) DO UPDATE SET
  updated_at = NOW();

-- Verify the setup
SELECT 
  schemaname, 
  tablename, 
  rowsecurity, 
  hasrls 
FROM pg_tables 
WHERE tablename IN ('players', 'game_sessions', 'anonymous_sessions', 'prize_pools', 'pending_claims')
  AND schemaname = 'public';

-- Show sample data
SELECT 'players' as table_name, COUNT(*) as count FROM players
UNION ALL
SELECT 'anonymous_sessions' as table_name, COUNT(*) as count FROM anonymous_sessions;
