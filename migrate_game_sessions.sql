-- Migration script to update game_sessions table for new game session structure
-- Run this in your Supabase SQL Editor

-- Add new columns to game_sessions table
ALTER TABLE IF EXISTS game_sessions 
ADD COLUMN IF NOT EXISTS player_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(10,2) DEFAULT 100.00;

-- Update existing game_sessions to have proper status
UPDATE game_sessions 
SET status = 'completed' 
WHERE status IS NULL OR status = '';

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Insert a default waiting session if none exists
INSERT INTO game_sessions (
  player_address,
  session_id,
  start_time,
  total_score,
  entry_fee,
  status,
  player_count,
  prize_pool,
  created_at
) 
SELECT 
  NULL,
  'default-session',
  NOW(),
  0,
  1.00,
  'waiting',
  0,
  100.00,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM game_sessions WHERE status = 'waiting'
);

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'game_sessions' 
  AND column_name IN ('player_count', 'prize_pool', 'status')
ORDER BY column_name;
