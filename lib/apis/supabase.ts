import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AudioFile = {
  name: string;
  path: string;
  artistName: string;
  songTitle: string;
};

// Database types
interface Player {
  id: string;
  wallet_address: string;
  username: string;
  trial_games_remaining: number;
  trial_completed: boolean;
  wallet_connected: boolean;
  total_score: number;
  games_played: number;
  best_score: number;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

interface AnonymousSession {
  id: string;
  session_id: string;
  games_played: number;
  total_score: number;
  best_score: number;
  created_at: string;
  updated_at: string;
}

interface GameSession {
  id: string;
  player_address: string | null;
  session_id: string | null;
  total_score: number;
  entry_fee: number;
  questions_data: TriviaQuestion[];
  answers_data: GameAnswer[];
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface TriviaQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: number;
  audioUrl?: string;
  imageUrl?: string;
  difficulty: string;
  timeLimit: number;
  metadata: Record<string, unknown>;
}

interface GameAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  pointsEarned: number;
}

const getServerClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase configuration missing:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!serviceKey 
    });
    return null;
  }
  
  console.log('Creating Supabase client with URL:', supabaseUrl);
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
};

const parseArtistAndTitle = (filename: string): { artistName: string; songTitle: string } => {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artistName: parts[0]!.trim(), songTitle: parts.slice(1).join(' - ').trim() };
  }
  // Fallback: try "Artist_Title"
  const under = base.split('_');
  if (under.length >= 2) {
    return { artistName: under[0]!.trim(), songTitle: under.slice(1).join(' ').trim() };
  }
  return { artistName: 'Unknown', songTitle: base.trim() || 'Unknown' };
};

export const SupabaseStorage = {
  // Check if Supabase is properly configured
  isConfigured(): boolean {
    return !!(process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  async listAudioFiles(bucket: string, prefix = ''): Promise<AudioFile[]> {
    const s = getServerClient();
    if (!s) {
      throw new Error('Supabase client not initialized');
    }
    const { data, error } = await s.storage.from(bucket).list(prefix, { 
      limit: 1000, 
      sortBy: { column: 'name', order: 'asc' } 
    });
    if (error) throw error;

    const allowed = ['.mp3', '.wav', '.m4a', '.ogg'];
    return (data || [])
      .filter((o) => allowed.some((ext) => o.name.toLowerCase().endsWith(ext)))
      .map((o) => {
        const { artistName, songTitle } = parseArtistAndTitle(o.name);
        return { 
          name: o.name, 
          path: prefix ? `${prefix}/${o.name}` : o.name, 
          artistName, 
          songTitle 
        };
      });
  },

  async createSignedUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
    const s = getServerClient();
    if (!s) {
      throw new Error('Supabase client not initialized');
    }
    const { data, error } = await s.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
};

// Add database operations
export const SupabaseDatabase = {
  // Get server client for database operations
  getClient(): SupabaseClient | null {
    return getServerClient();
  },

  // Player management
  async createPlayer(walletAddress: string, username?: string): Promise<Player | null> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client
      .from('players')
      .upsert({ 
        wallet_address: walletAddress, 
        username: username || `Player_${walletAddress.slice(-6)}`,
        trial_games_remaining: 3,
        trial_completed: false,
        wallet_connected: true
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getPlayer(walletAddress: string): Promise<Player | null> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client
      .from('players')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Anonymous session management
  async getOrCreateAnonymousSession(sessionId: string): Promise<AnonymousSession | null> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    // Try to get existing session
    const { data, error } = await client
      .from('anonymous_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // Create new session if doesn't exist
    if (!data) {
      const { data: newSession, error: createError } = await client
        .from('anonymous_sessions')
        .insert({ session_id: sessionId })
        .select()
        .single();
        
      if (createError) throw createError;
      return newSession;
    }
    
    return data;
  },

  async updateAnonymousSession(sessionId: string, gameScore: number): Promise<void> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    // First get current values
    const { data: current, error: fetchError } = await client
      .from('anonymous_sessions')
      .select('games_played, total_score, best_score')
      .eq('session_id', sessionId)
      .single();
      
    if (fetchError) throw fetchError;
    
    const { error } = await client
      .from('anonymous_sessions')
      .update({
        games_played: (current?.games_played || 0) + 1,
        total_score: (current?.total_score || 0) + gameScore,
        best_score: Math.max(current?.best_score || 0, gameScore),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
      
    if (error) throw error;
  },

  // Trial management
  async getPlayerTrialStatus(walletAddress: string): Promise<Pick<Player, 'trial_games_remaining' | 'trial_completed' | 'wallet_connected'> | null> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client
      .from('players')
      .select('trial_games_remaining, trial_completed, wallet_connected')
      .eq('wallet_address', walletAddress)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async decrementTrialGames(walletAddress: string): Promise<void> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    // First get current trial games remaining
    const { data: current, error: fetchError } = await client
      .from('players')
      .select('trial_games_remaining')
      .eq('wallet_address', walletAddress)
      .single();
      
    if (fetchError) throw fetchError;
    
    const newTrialGames = Math.max(0, (current?.trial_games_remaining || 0) - 1);
    const trialCompleted = newTrialGames === 0;
    
    const { error } = await client
      .from('players')
      .update({
        trial_games_remaining: newTrialGames,
        trial_completed: trialCompleted
      })
      .eq('wallet_address', walletAddress);
      
    if (error) throw error;
  },

  // Game session management
  async saveGameSession(sessionData: {
    playerAddress?: string;
    sessionId?: string;
    totalScore: number;
    entryFee: number;
    questions: TriviaQuestion[];
    answers: GameAnswer[];
  }): Promise<GameSession | null> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client
      .from('game_sessions')
      .insert({
        player_address: sessionData.playerAddress || null,
        session_id: sessionData.sessionId || null,
        total_score: sessionData.totalScore,
        entry_fee: sessionData.entryFee,
        questions_data: sessionData.questions,
        answers_data: sessionData.answers,
        end_time: new Date().toISOString(),
        status: 'completed'
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Update player stats if wallet connected
    if (sessionData.playerAddress) {
      await this.updatePlayerStats(sessionData.playerAddress, sessionData.totalScore);
    }
    
    return data;
  },

  async updatePlayerStats(playerAddress: string, newScore: number): Promise<void> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    // First get current values
    const { data: current, error: fetchError } = await client
      .from('players')
      .select('total_score, games_played, best_score')
      .eq('wallet_address', playerAddress)
      .single();
      
    if (fetchError) throw fetchError;
    
    const { error } = await client
      .from('players')
      .update({
        total_score: (current?.total_score || 0) + newScore,
        games_played: (current?.games_played || 0) + 1,
        best_score: Math.max(current?.best_score || 0, newScore),
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', playerAddress);
      
    if (error) throw error;
  },

  // Leaderboard
  async getLeaderboard(limit: number = 10): Promise<Pick<Player, 'id' | 'wallet_address' | 'username' | 'total_score' | 'games_played' | 'best_score' | 'total_earnings' | 'updated_at'>[]> {
    const client = getServerClient();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client
      .from('players')
      .select(`
        id,
        wallet_address,
        username,
        total_score,
        games_played,
        best_score,
        total_earnings,
        updated_at
      `)
      .order('total_score', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  }
};
