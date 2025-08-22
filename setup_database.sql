-- Database setup script for BEATME trivia game
-- Run this in your Supabase SQL Editor

-- First, let's disable RLS for development (we can enable it later with proper policies)
ALTER TABLE IF EXISTS players DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anonymous_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prize_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_claims DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you prefer to keep RLS enabled, uncomment the policies below:
/*
-- Enable RLS but allow all operations for development
CREATE POLICY "Allow all operations" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON anonymous_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON prize_pools FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON pending_claims FOR ALL USING (true);
*/

-- Verify the setup
SELECT schemaname, tablename, rowsecurity, hasrls 
FROM pg_tables 
WHERE tablename IN ('players', 'game_sessions', 'anonymous_sessions', 'prize_pools', 'pending_claims')
  AND schemaname = 'public';

-- Test insert to verify permissions work
INSERT INTO anonymous_sessions (session_id, games_played, total_score, best_score) 
VALUES ('test-session-' || floor(random() * 1000), 0, 0, 0)
ON CONFLICT (session_id) DO NOTHING;
