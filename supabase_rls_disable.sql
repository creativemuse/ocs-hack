-- Disable Row Level Security (RLS) for development
-- Run this in your Supabase SQL Editor

-- Disable RLS for all our tables
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prize_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_claims DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('players', 'game_sessions', 'anonymous_sessions', 'prize_pools', 'pending_claims');
