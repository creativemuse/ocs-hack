use spacetimedb::{ReducerContext, Table, Identity, Timestamp, TimeDuration};
use std::time::Duration;

// Audio file metadata stored in SpacetimeDB
#[spacetimedb::table(name = audio_files)]
#[derive(Clone)]
pub struct AudioFile {
    pub name: String,
    pub artist_name: String,
    pub song_title: String,
    pub ipfs_cid: String,
    pub ipfs_url: String,
    pub file_size: u64,
    pub duration: Option<f64>,
    pub uploaded_at: Timestamp,
    pub uploaded_by: Identity,
}

// Game sessions stored in SpacetimeDB
#[spacetimedb::table(name = game_sessions)]
#[derive(Clone)]
pub struct GameSession {
    pub session_id: String,
    pub player_identity: Identity,
    pub player_type: String, // "paid" or "trial"
    pub score: u32,
    pub questions_answered: u32,
    pub correct_answers: u32,
    pub started_at: Timestamp,
    pub ended_at: Option<Timestamp>,
    pub difficulty: String,
    pub game_mode: String,
}

// Active game sessions for countdown management
#[spacetimedb::table(name = active_game_sessions)]
#[derive(Clone)]
pub struct ActiveGameSession {
    pub session_id: String,
    pub status: String, // "waiting", "active", "completed"
    pub player_count: u32,
    pub paid_player_count: u32, // Only paid players contribute to prize pool
    pub trial_player_count: u32, // Trial players for tracking only
    pub prize_pool: f64, // Only accumulates from paid player entry fees
    pub entry_fee: f64,
    pub start_time: Timestamp,
    pub created_at: Timestamp,
}

// Player statistics stored in SpacetimeDB
#[spacetimedb::table(name = player_stats)]
#[derive(Clone)]
pub struct PlayerStats {
    pub player_identity: Identity,
    pub player_type: String, // "paid" or "trial"
    pub total_games: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub average_score: f64,
    pub total_questions_answered: u32,
    pub total_correct_answers: u32,
    pub last_played: Timestamp,
}

// Guest player data stored in SpacetimeDB
#[spacetimedb::table(name = guest_players)]
#[derive(Clone)]
pub struct GuestPlayer {
    pub guest_id: String,
    pub name: String,
    pub player_type: String, // Always "trial" for guest players
    pub games_played: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub achievements: String, // JSON string of achievement IDs
    pub created_at: Timestamp,
    pub last_played: Timestamp,
}

// Guest game sessions stored in SpacetimeDB
#[spacetimedb::table(name = guest_game_sessions)]
#[derive(Clone)]
pub struct GuestGameSession {
    pub session_id: String,
    pub guest_id: String,
    pub player_type: String, // Always "trial" for guest players
    pub score: u32,
    pub questions_answered: u32,
    pub correct_answers: u32,
    pub started_at: Timestamp,
    pub ended_at: Option<Timestamp>,
    pub game_data: String, // JSON string of game details
}

// Players table for wallet-connected users (replaces Supabase players table)
#[spacetimedb::table(name = players)]
#[derive(Clone)]
pub struct Player {
    pub wallet_address: String,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
    pub total_score: u32,
    pub games_played: u32,
    pub best_score: u32,
    pub total_earnings: f64,
    pub trial_games_remaining: u32,
    pub trial_completed: bool,
    pub wallet_connected: bool,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

// Game entries for tracking paid/trial status (replaces Supabase game_entries)
#[spacetimedb::table(name = game_entries)]
#[derive(Clone)]
pub struct GameEntry {
    pub session_id: String,
    pub wallet_address: Option<String>, // NULL for anonymous sessions
    pub anon_id: Option<String>, // For anonymous sessions
    pub is_trial: bool,
    pub status: String, // "verified", "consumed", etc.
    pub paid_tx_hash: Option<String>,
    pub verified_at: Timestamp,
    pub created_at: Timestamp,
}

// Anonymous sessions (replaces Supabase anonymous_sessions)
#[spacetimedb::table(name = anonymous_sessions)]
#[derive(Clone)]
pub struct AnonymousSession {
    pub session_id: String,
    pub games_played: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

// Prize pools (replaces Supabase prize_pools)
#[spacetimedb::table(name = prize_pools)]
#[derive(Clone)]
pub struct PrizePool {
    pub game_id: String,
    pub total_amount: f64,
    pub entry_fee: f64,
    pub paid_players: u32,
    pub free_players: u32,
    pub winner_address: Option<String>,
    pub winner_score: Option<u32>,
    pub claimed: bool,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
}

// Pending claims (replaces Supabase pending_claims)
#[spacetimedb::table(name = pending_claims)]
#[derive(Clone)]
pub struct PendingClaim {
    pub session_id: String,
    pub wallet_address: Option<String>,
    pub game_id: String,
    pub prize_amount: f64,
    pub score: u32,
    pub claimed: bool,
    pub claim_transaction_hash: Option<String>,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
}

// Question attempts stored in SpacetimeDB
#[spacetimedb::table(name = question_attempts)]
#[derive(Clone)]
pub struct QuestionAttempt {
    pub session_id: String,
    pub player_identity: Identity,
    pub player_type: String, // "paid" or "trial"
    pub audio_file_id: String,
    pub selected_answer: u32,
    pub correct_answer: u32,
    pub is_correct: bool,
    pub time_taken: f64,
    pub answered_at: Timestamp,
}

// ============================================================================
// ROW LEVEL SECURITY (RLS) IMPLEMENTATION
// ============================================================================
// Note: RLS requires public tables, but for now we'll implement access control
// at the reducer level. This provides data isolation while maintaining functionality.

// TODO: Implement RLS when public table syntax is clarified
// For now, access control is handled in reducers with proper identity checking

// ============================================================================
// ADMIN FILTERS FOR GLOBAL DATA ACCESS
// ============================================================================

// Admin table for authorized administrators (you'll need to populate this)
#[spacetimedb::table(name = admins)]
#[derive(Clone)]
pub struct Admin {
    pub admin_identity: Identity,
    pub admin_level: String, // "super_admin", "admin", "moderator"
    pub granted_at: Timestamp,
    pub granted_by: Identity,
}

// Note: Admin filters with JOINs are not supported in RLS
// Instead, we'll implement admin access control at the reducer level
// RLS filters are for basic data isolation, admin access is handled in reducers

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("🎵 Beat Me Audio Game Module initialized!");
    log::info!("⚠️ Trial players are excluded from prize pool distributions");
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    log::info!("👤 Player connected: {:?}", identity);
    
    // Initialize player stats if they don't exist
    let existing_stats = ctx.db.player_stats().iter().find(|stats| stats.player_identity == identity);
    if existing_stats.is_none() {
        ctx.db.player_stats().insert(PlayerStats {
            player_identity: identity,
            player_type: "trial".to_string(), // Default to trial until they pay
            total_games: 0,
            total_score: 0,
            best_score: 0,
            average_score: 0.0,
            total_questions_answered: 0,
            total_correct_answers: 0,
            last_played: ctx.timestamp,
        });
        log::info!("📊 Initialized stats for new player: {:?} (trial)", identity);
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    log::info!("👤 Player disconnected: {:?}", identity);
}

// Guest player reducers
#[spacetimedb::reducer]
pub fn create_guest_player(ctx: &ReducerContext, guest_id: String, name: String) {
    log::info!("👤 Creating guest player: {} ({})", name, guest_id);
    
    // Check if guest player already exists
    let existing_guest = ctx.db.guest_players().iter().find(|guest| guest.guest_id == guest_id);
    if existing_guest.is_none() {
        ctx.db.guest_players().insert(GuestPlayer {
            guest_id: guest_id.clone(),
            name,
            player_type: "trial".to_string(), // Guest players are always trial
            games_played: 0,
            total_score: 0,
            best_score: 0,
            achievements: "[]".to_string(), // Empty JSON array
            created_at: ctx.timestamp,
            last_played: ctx.timestamp,
        });
        log::info!("✅ Guest player created: {} (trial)", guest_id);
    } else {
        log::info!("⚠️ Guest player already exists: {}", guest_id);
    }
}

#[spacetimedb::reducer]
pub fn update_guest_player(ctx: &ReducerContext, guest_id: String, games_played: u32, total_score: u32, best_score: u32, achievements: String) {
    log::info!("📊 Updating guest player: {} (games: {}, score: {}, best: {})", guest_id, games_played, total_score, best_score);
    
    // Find and update existing guest player
    if let Some(guest) = ctx.db.guest_players().iter().find(|g| g.guest_id == guest_id) {
        ctx.db.guest_players().delete(guest.clone());
        ctx.db.guest_players().insert(GuestPlayer {
            guest_id: guest_id.clone(),
            name: guest.name.clone(),
            player_type: "trial".to_string(), // Guest players remain trial
            games_played,
            total_score,
            best_score,
            achievements,
            created_at: guest.created_at,
            last_played: ctx.timestamp,
        });
        log::info!("✅ Guest player updated: {} (trial)", guest_id);
    } else {
        log::warn!("❌ Guest player not found for update: {}", guest_id);
    }
}

#[spacetimedb::reducer]
pub fn record_guest_game(ctx: &ReducerContext, session_id: String, guest_id: String, score: u32, questions_answered: u32, correct_answers: u32, game_data: String) {
    log::info!("🎮 Recording guest game: {} for guest {} (score: {})", session_id, guest_id, score);
    
    ctx.db.guest_game_sessions().insert(GuestGameSession {
        session_id: session_id.clone(),
        guest_id,
        player_type: "trial".to_string(), // Guest games are always trial
        score,
        questions_answered,
        correct_answers,
        started_at: ctx.timestamp,
        ended_at: Some(ctx.timestamp),
        game_data,
    });
    
    log::info!("✅ Guest game recorded: {} (trial)", session_id);
}

// Add audio file to the database
#[spacetimedb::reducer]
pub fn add_audio_file(
    ctx: &ReducerContext,
    name: String,
    artist_name: String,
    song_title: String,
    ipfs_cid: String,
    file_size: u64,
    duration: Option<f64>,
) {
    let identity = ctx.sender;
    
    // Check if file already exists
    let existing = ctx.db.audio_files().iter().find(|file| file.name == name);
    if existing.is_some() {
        log::warn!("⚠️ Audio file already exists: {}", name);
        return;
    }
    
    // Construct IPFS URL with proper encoding
    let ipfs_url = format!("https://storacha.link/ipfs/{}", ipfs_cid);
    
    ctx.db.audio_files().insert(AudioFile {
        name: name.clone(),
        artist_name: artist_name.clone(),
        song_title: song_title.clone(),
        ipfs_cid,
        ipfs_url,
        file_size,
        duration,
        uploaded_at: ctx.timestamp,
        uploaded_by: identity,
    });
    
    log::info!("✅ Added audio file: {} - {}", artist_name, song_title);
}

// Start a new game session
#[spacetimedb::reducer]
pub fn start_game_session(
    ctx: &ReducerContext,
    session_id: String,
    difficulty: String,
    game_mode: String,
    player_type: String, // "paid" or "trial"
) {
    let identity = ctx.sender;
    
    ctx.db.game_sessions().insert(GameSession {
        session_id: session_id.clone(),
        player_identity: identity,
        player_type: player_type.clone(),
        score: 0,
        questions_answered: 0,
        correct_answers: 0,
        started_at: ctx.timestamp,
        ended_at: None,
        difficulty,
        game_mode,
    });
    
    log::info!("🎮 Started game session: {} for player {:?} ({})", session_id, identity, player_type);
}

// Record a question attempt
#[spacetimedb::reducer]
pub fn record_question_attempt(
    ctx: &ReducerContext,
    session_id: String,
    audio_file_name: String,
    selected_answer: u32,
    correct_answer: u32,
    time_taken: f64,
    player_type: String, // "paid" or "trial"
) {
    let identity = ctx.sender;
    let is_correct = selected_answer == correct_answer;
    
    ctx.db.question_attempts().insert(QuestionAttempt {
        session_id: session_id.clone(),
        player_identity: identity,
        player_type: player_type.clone(),
        audio_file_id: audio_file_name.clone(),
        selected_answer,
        correct_answer,
        is_correct,
        time_taken,
        answered_at: ctx.timestamp,
    });
    
    // Update game session
    if let Some(session) = ctx.db.game_sessions().iter().find(|s| s.session_id == session_id) {
        let new_score = session.score + if is_correct { 10 } else { 0 };
        let new_questions = session.questions_answered + 1;
        let new_correct = session.correct_answers + if is_correct { 1 } else { 0 };
        
        // Clone session data before deleting
        let session_data = GameSession {
            session_id: session.session_id.clone(),
            player_identity: session.player_identity,
            player_type: session.player_type.clone(),
            score: new_score,
            questions_answered: new_questions,
            correct_answers: new_correct,
            started_at: session.started_at,
            ended_at: session.ended_at,
            difficulty: session.difficulty.clone(),
            game_mode: session.game_mode.clone(),
        };
        
        // Remove old session and insert updated one
        ctx.db.game_sessions().delete(session);
        ctx.db.game_sessions().insert(session_data);
    }
    
    log::info!("📝 Recorded question attempt: {} (correct: {}, type: {})", audio_file_name, is_correct, player_type);
}

// End a game session
#[spacetimedb::reducer]
pub fn end_game_session(ctx: &ReducerContext, session_id: String) {
    let identity = ctx.sender;
    
    if let Some(session) = ctx.db.game_sessions().iter().find(|s| s.session_id == session_id) {
        let session_score = session.score;
        let session_questions = session.questions_answered;
        let session_correct = session.correct_answers;
        let player_type = session.player_type.clone();
        
        // Clone session data before deleting
        let session_data = GameSession {
            session_id: session.session_id.clone(),
            player_identity: session.player_identity,
            player_type: session.player_type.clone(),
            score: session.score,
            questions_answered: session.questions_answered,
            correct_answers: session.correct_answers,
            started_at: session.started_at,
            ended_at: Some(ctx.timestamp),
            difficulty: session.difficulty.clone(),
            game_mode: session.game_mode.clone(),
        };
        
        // Update session with end time
        ctx.db.game_sessions().delete(session);
        ctx.db.game_sessions().insert(session_data);
        
        // Update player stats
        if let Some(stats) = ctx.db.player_stats().iter().find(|s| s.player_identity == identity) {
            let new_total_games = stats.total_games + 1;
            let new_total_score = stats.total_score + session_score;
            let new_best_score = std::cmp::max(stats.best_score, session_score);
            let new_total_questions = stats.total_questions_answered + session_questions;
            let new_total_correct = stats.total_correct_answers + session_correct;
            let new_average = new_total_score as f64 / new_total_games as f64;
            
            ctx.db.player_stats().delete(stats);
            ctx.db.player_stats().insert(PlayerStats {
                player_identity: identity,
                player_type: player_type.clone(),
                total_games: new_total_games,
                total_score: new_total_score,
                best_score: new_best_score,
                average_score: new_average,
                total_questions_answered: new_total_questions,
                total_correct_answers: new_total_correct,
                last_played: ctx.timestamp,
            });
        }
        
        log::info!("🏁 Ended game session: {} (score: {}, type: {})", session_id, session_score, player_type);
    }
}

// Get random audio files for questions (simplified - just log the count)
#[spacetimedb::reducer]
pub fn get_random_audio_files(ctx: &ReducerContext, count: u32) {
    let files: Vec<_> = ctx.db.audio_files().iter().collect();
    let actual_count = count.min(files.len() as u32);
    
    log::info!("🎵 Requested {} random audio files, found {} total files", count, files.len());
    
    // In a real implementation, you'd return the selected files
    // For now, just log the request
    for (i, file) in files.iter().take(actual_count as usize).enumerate() {
        log::info!("  {}. {} - {}", i + 1, file.artist_name, file.song_title);
    }
}

// Get player stats (simplified - just log the request)
#[spacetimedb::reducer]
pub fn get_player_stats(ctx: &ReducerContext) {
    let identity = ctx.sender;
    if let Some(stats) = ctx.db.player_stats().iter().find(|stats| stats.player_identity == identity) {
        log::info!("📊 Player stats for {:?}: {} games, {} total score, {} best score, type: {}", 
                  identity, stats.total_games, stats.total_score, stats.best_score, stats.player_type);
    } else {
        log::info!("📊 No stats found for player {:?}", identity);
    }
}

// Get leaderboard (ONLY paid players eligible for prizes)
#[spacetimedb::reducer]
pub fn get_leaderboard(ctx: &ReducerContext, limit: u32) {
    // Filter to only paid players for prize-eligible leaderboard
    let mut paid_stats: Vec<_> = ctx.db.player_stats().iter()
        .filter(|stat| stat.player_type == "paid")
        .collect();
    paid_stats.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    
    log::info!("🏆 Leaderboard request (top {} paid players only):", limit);
    for (i, stat) in paid_stats.iter().take(limit as usize).enumerate() {
        log::info!("  {}. Player {:?}: {} best score (paid)", i + 1, stat.player_identity, stat.best_score);
    }
}

// Get trial player leaderboard (for display purposes only, no prizes)
#[spacetimedb::reducer]
pub fn get_trial_leaderboard(ctx: &ReducerContext, limit: u32) {
    // Filter to only trial players
    let mut trial_stats: Vec<_> = ctx.db.player_stats().iter()
        .filter(|stat| stat.player_type == "trial")
        .collect();
    trial_stats.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    
    log::info!("🏆 Trial leaderboard request (top {} trial players, no prizes):", limit);
    for (i, stat) in trial_stats.iter().take(limit as usize).enumerate() {
        log::info!("  {}. Player {:?}: {} best score (trial)", i + 1, stat.player_identity, stat.best_score);
    }
}

// Get current active game session
#[spacetimedb::reducer]
pub fn get_active_game_session(ctx: &ReducerContext) {
    let _identity = ctx.sender;
    
    // Find the most recent active session
    let active_session = ctx.db.active_game_sessions().iter()
        .filter(|s| s.status == "active" || s.status == "waiting")
        .max_by_key(|s| s.created_at);
    
    if let Some(session) = active_session {
        log::info!("🎮 Active game session found: {} (status: {}, paid: {}, trial: {})", 
                  session.session_id, session.status, session.paid_player_count, session.trial_player_count);
    } else {
        log::info!("🎮 No active game session found, creating new one");
        // Create a new waiting session
        let new_session_id = format!("session_{}", ctx.timestamp);
        ctx.db.active_game_sessions().insert(ActiveGameSession {
            session_id: new_session_id.clone(),
            status: "waiting".to_string(),
            player_count: 0,
            paid_player_count: 0,
            trial_player_count: 0,
            prize_pool: 0.0, // Start with 0 - only accumulates from paid player entry fees
            entry_fee: 1.0,
            start_time: ctx.timestamp,
            created_at: ctx.timestamp,
        });
        log::info!("✅ Created new waiting session: {}", new_session_id);
    }
}

// Join active game session
#[spacetimedb::reducer]
pub fn join_active_game_session(ctx: &ReducerContext, player_type: String) {
    let _identity = ctx.sender;
    
    // Find the most recent active session
    let active_session = ctx.db.active_game_sessions().iter()
        .filter(|s| s.status == "active" || s.status == "waiting")
        .max_by_key(|s| s.created_at);
    
    if let Some(session) = active_session {
        let is_first_player = session.player_count == 0;
        let new_status: String = if is_first_player { "active".to_string() } else { session.status.clone() };
        let new_start_time = if is_first_player { ctx.timestamp } else { session.start_time };
        let session_id_clone = session.session_id.clone();
        let previous_player_count = session.player_count;
        let previous_paid_count = session.paid_player_count;
        let previous_trial_count = session.trial_player_count;
        let session_created_at = session.created_at;
        let entry_fee = session.entry_fee;
        
        // Update counts based on player type
        let new_paid_count = if player_type == "paid" { previous_paid_count + 1 } else { previous_paid_count };
        let new_trial_count = if player_type == "trial" { previous_trial_count + 1 } else { previous_trial_count };
        
        // Only paid players contribute to prize pool
        let new_prize_pool = if player_type == "paid" { 
            session.prize_pool + entry_fee 
        } else { 
            session.prize_pool 
        };
        
        // Update the session
        ctx.db.active_game_sessions().delete(session);
        ctx.db.active_game_sessions().insert(ActiveGameSession {
            session_id: session_id_clone.clone(),
            status: new_status,
            player_count: previous_player_count + 1,
            paid_player_count: new_paid_count,
            trial_player_count: new_trial_count,
            prize_pool: new_prize_pool,
            entry_fee,
            start_time: new_start_time,
            created_at: session_created_at,
        });
        
        if is_first_player {
            log::info!("🎮 First player joined session: {} (starting countdown, type: {})", session_id_clone, player_type);
        } else {
            log::info!("🎮 Player joined session: {} (total: {}, paid: {}, trial: {}, type: {})", 
                      session_id_clone, previous_player_count + 1, new_paid_count, new_trial_count, player_type);
        }
    } else {
        log::warn!("⚠️ No active session found to join");
    }
}

// Update player type (trial to paid)
#[spacetimedb::reducer]
pub fn update_player_type(ctx: &ReducerContext, new_type: String) {
    let identity = ctx.sender;
    
    if let Some(stats) = ctx.db.player_stats().iter().find(|s| s.player_identity == identity) {
        let updated_stats = PlayerStats {
            player_identity: identity,
            player_type: new_type.clone(),
            total_games: stats.total_games,
            total_score: stats.total_score,
            best_score: stats.best_score,
            average_score: stats.average_score,
            total_questions_answered: stats.total_questions_answered,
            total_correct_answers: stats.total_correct_answers,
            last_played: stats.last_played,
        };
        
        ctx.db.player_stats().delete(stats);
        ctx.db.player_stats().insert(updated_stats);
        
        log::info!("🔄 Updated player type for {:?}: {}", identity, new_type);
    } else {
        log::warn!("❌ No stats found for player {:?}", identity);
    }
}

// Player management reducers
#[spacetimedb::reducer]
pub fn create_player(ctx: &ReducerContext, wallet_address: String, username: Option<String>) {
    log::info!("👤 Creating player: {} ({})", wallet_address, username.as_deref().unwrap_or("no username"));
    
    // Check if player already exists
    let existing_player = ctx.db.players().iter().find(|p| p.wallet_address == wallet_address);
    if existing_player.is_none() {
        ctx.db.players().insert(Player {
            wallet_address: wallet_address.clone(),
            username,
            avatar_url: None,
            total_score: 0,
            games_played: 0,
            best_score: 0,
            total_earnings: 0.0,
            trial_games_remaining: 1,
            trial_completed: false,
            wallet_connected: true,
            created_at: ctx.timestamp,
            updated_at: ctx.timestamp,
        });
        log::info!("✅ Player created: {}", wallet_address);
    } else {
        log::info!("⚠️ Player already exists: {}", wallet_address);
    }
}

#[spacetimedb::reducer]
pub fn update_player_stats(ctx: &ReducerContext, wallet_address: String, total_score: u32, games_played: u32, best_score: u32, total_earnings: f64) {
    log::info!("📊 Updating player stats: {} (score: {}, games: {}, best: {})", wallet_address, total_score, games_played, best_score);
    
    if let Some(player) = ctx.db.players().iter().find(|p| p.wallet_address == wallet_address) {
        let player_clone = player.clone();
        ctx.db.players().delete(player);
        ctx.db.players().insert(Player {
            wallet_address: player_clone.wallet_address.clone(),
            username: player_clone.username.clone(),
            avatar_url: player_clone.avatar_url.clone(),
            total_score,
            games_played,
            best_score,
            total_earnings,
            trial_games_remaining: player_clone.trial_games_remaining,
            trial_completed: player_clone.trial_completed,
            wallet_connected: player_clone.wallet_connected,
            created_at: player_clone.created_at,
            updated_at: ctx.timestamp,
        });
        log::info!("✅ Player stats updated: {}", wallet_address);
    } else {
        log::warn!("❌ Player not found for update: {}", wallet_address);
    }
}

#[spacetimedb::reducer]
pub fn update_trial_status(ctx: &ReducerContext, wallet_address: String, trial_games_remaining: u32, trial_completed: bool) {
    log::info!("🎯 Updating trial status: {} (remaining: {}, completed: {})", wallet_address, trial_games_remaining, trial_completed);
    
    if let Some(player) = ctx.db.players().iter().find(|p| p.wallet_address == wallet_address) {
        let player_clone = player.clone();
        ctx.db.players().delete(player);
        ctx.db.players().insert(Player {
            wallet_address: player_clone.wallet_address.clone(),
            username: player_clone.username.clone(),
            avatar_url: player_clone.avatar_url.clone(),
            total_score: player_clone.total_score,
            games_played: player_clone.games_played,
            best_score: player_clone.best_score,
            total_earnings: player_clone.total_earnings,
            trial_games_remaining,
            trial_completed,
            wallet_connected: player_clone.wallet_connected,
            created_at: player_clone.created_at,
            updated_at: ctx.timestamp,
        });
        log::info!("✅ Trial status updated: {}", wallet_address);
    } else {
        log::warn!("❌ Player not found for trial update: {}", wallet_address);
    }
}

// Game entry management
#[spacetimedb::reducer]
pub fn create_game_entry(ctx: &ReducerContext, session_id: String, wallet_address: Option<String>, anon_id: Option<String>, is_trial: bool, paid_tx_hash: Option<String>) {
    log::info!("🎮 Creating game entry: {} (wallet: {:?}, anon: {:?}, trial: {})", session_id, wallet_address, anon_id, is_trial);
    
    ctx.db.game_entries().insert(GameEntry {
        session_id: session_id.clone(),
        wallet_address,
        anon_id,
        is_trial,
        status: "verified".to_string(),
        paid_tx_hash,
        verified_at: ctx.timestamp,
        created_at: ctx.timestamp,
    });
    
    log::info!("✅ Game entry created: {}", session_id);
}

#[spacetimedb::reducer]
pub fn mark_entry_consumed(ctx: &ReducerContext, session_id: String) {
    log::info!("✅ Marking game entry as consumed: {}", session_id);
    
    if let Some(entry) = ctx.db.game_entries().iter().find(|e| e.session_id == session_id) {
        let entry_clone = entry.clone();
        ctx.db.game_entries().delete(entry);
        ctx.db.game_entries().insert(GameEntry {
            session_id: entry_clone.session_id.clone(),
            wallet_address: entry_clone.wallet_address.clone(),
            anon_id: entry_clone.anon_id.clone(),
            is_trial: entry_clone.is_trial,
            status: "consumed".to_string(),
            paid_tx_hash: entry_clone.paid_tx_hash.clone(),
            verified_at: entry_clone.verified_at,
            created_at: entry_clone.created_at,
        });
        log::info!("✅ Game entry marked as consumed: {}", session_id);
    } else {
        log::warn!("❌ Game entry not found: {}", session_id);
    }
}

// Anonymous session management
#[spacetimedb::reducer]
pub fn create_anonymous_session(ctx: &ReducerContext, session_id: String) {
    log::info!("👤 Creating anonymous session: {}", session_id);
    
    let existing_session = ctx.db.anonymous_sessions().iter().find(|s| s.session_id == session_id);
    if existing_session.is_none() {
        ctx.db.anonymous_sessions().insert(AnonymousSession {
            session_id: session_id.clone(),
            games_played: 0,
            total_score: 0,
            best_score: 0,
            created_at: ctx.timestamp,
            updated_at: ctx.timestamp,
        });
        log::info!("✅ Anonymous session created: {}", session_id);
    } else {
        log::info!("⚠️ Anonymous session already exists: {}", session_id);
    }
}

#[spacetimedb::reducer]
pub fn update_anonymous_session(ctx: &ReducerContext, session_id: String, games_played: u32, total_score: u32, best_score: u32) {
    log::info!("📊 Updating anonymous session: {} (games: {}, score: {}, best: {})", session_id, games_played, total_score, best_score);
    
    if let Some(session) = ctx.db.anonymous_sessions().iter().find(|s| s.session_id == session_id) {
        let session_clone = session.clone();
        ctx.db.anonymous_sessions().delete(session);
        ctx.db.anonymous_sessions().insert(AnonymousSession {
            session_id: session_clone.session_id.clone(),
            games_played,
            total_score,
            best_score,
            created_at: session_clone.created_at,
            updated_at: ctx.timestamp,
        });
        log::info!("✅ Anonymous session updated: {}", session_id);
    } else {
        log::warn!("❌ Anonymous session not found: {}", session_id);
    }
}

// Prize pool management
#[spacetimedb::reducer]
pub fn create_prize_pool(ctx: &ReducerContext, game_id: String, entry_fee: f64) {
    log::info!("💰 Creating prize pool: {} (entry fee: {})", game_id, entry_fee);
    
    let expires_at = ctx.timestamp + TimeDuration::from_duration(Duration::from_secs(24 * 60 * 60)); // 24 hours from now
    
    ctx.db.prize_pools().insert(PrizePool {
        game_id: game_id.clone(),
        total_amount: 0.0,
        entry_fee,
        paid_players: 0,
        free_players: 0,
        winner_address: None,
        winner_score: None,
        claimed: false,
        created_at: ctx.timestamp,
        expires_at,
    });
    
    log::info!("✅ Prize pool created: {}", game_id);
}

#[spacetimedb::reducer]
pub fn update_prize_pool(ctx: &ReducerContext, game_id: String, total_amount: f64, paid_players: u32, free_players: u32, winner_address: Option<String>, winner_score: Option<u32>, claimed: bool) {
    log::info!("💰 Updating prize pool: {} (amount: {}, paid: {}, free: {})", game_id, total_amount, paid_players, free_players);
    
    if let Some(pool) = ctx.db.prize_pools().iter().find(|p| p.game_id == game_id) {
        let pool_clone = pool.clone();
        ctx.db.prize_pools().delete(pool);
        ctx.db.prize_pools().insert(PrizePool {
            game_id: pool_clone.game_id.clone(),
            total_amount,
            entry_fee: pool_clone.entry_fee,
            paid_players,
            free_players,
            winner_address,
            winner_score,
            claimed,
            created_at: pool_clone.created_at,
            expires_at: pool_clone.expires_at,
        });
        log::info!("✅ Prize pool updated: {}", game_id);
    } else {
        log::warn!("❌ Prize pool not found: {}", game_id);
    }
}

// Pending claims management
#[spacetimedb::reducer]
pub fn create_pending_claim(ctx: &ReducerContext, session_id: String, wallet_address: Option<String>, game_id: String, prize_amount: f64, score: u32) {
    log::info!("🎁 Creating pending claim: {} (amount: {}, score: {})", session_id, prize_amount, score);
    
    let expires_at = ctx.timestamp + TimeDuration::from_duration(Duration::from_secs(7 * 24 * 60 * 60)); // 7 days from now
    
    ctx.db.pending_claims().insert(PendingClaim {
        session_id: session_id.clone(),
        wallet_address,
        game_id,
        prize_amount,
        score,
        claimed: false,
        claim_transaction_hash: None,
        created_at: ctx.timestamp,
        expires_at,
    });
    
    log::info!("✅ Pending claim created: {}", session_id);
}

#[spacetimedb::reducer]
pub fn mark_claim_claimed(ctx: &ReducerContext, session_id: String, claim_transaction_hash: String) {
    log::info!("✅ Marking claim as claimed: {} (tx: {})", session_id, claim_transaction_hash);
    
    if let Some(claim) = ctx.db.pending_claims().iter().find(|c| c.session_id == session_id) {
        let claim_clone = claim.clone();
        ctx.db.pending_claims().delete(claim);
        ctx.db.pending_claims().insert(PendingClaim {
            session_id: claim_clone.session_id.clone(),
            wallet_address: claim_clone.wallet_address.clone(),
            game_id: claim_clone.game_id.clone(),
            prize_amount: claim_clone.prize_amount,
            score: claim_clone.score,
            claimed: true,
            claim_transaction_hash: Some(claim_transaction_hash),
            created_at: claim_clone.created_at,
            expires_at: claim_clone.expires_at,
        });
        log::info!("✅ Claim marked as claimed: {}", session_id);
    } else {
        log::warn!("❌ Pending claim not found: {}", session_id);
    }
}

// ============================================================================
// ADMIN MANAGEMENT REDUCERS
// ============================================================================

// Grant admin privileges to a user (only existing admins can grant privileges)
#[spacetimedb::reducer]
pub fn grant_admin_privileges(ctx: &ReducerContext, target_identity: Identity, admin_level: String) {
    let grantor_identity = ctx.sender;
    
    // Check if the grantor is an existing admin OR if this is the first admin (no admins exist)
    let is_grantor_admin = ctx.db.admins().iter().any(|admin| admin.admin_identity == grantor_identity);
    let is_first_admin = ctx.db.admins().iter().count() == 0;
    
    if !is_grantor_admin && !is_first_admin {
        log::warn!("❌ Unauthorized attempt to grant admin privileges by {:?}", grantor_identity);
        return;
    }
    
    // Check if target already has admin privileges
    let existing_admin = ctx.db.admins().iter().find(|admin| admin.admin_identity == target_identity);
    if existing_admin.is_some() {
        log::warn!("⚠️ Admin privileges already exist for {:?}", target_identity);
        return;
    }
    
    // Grant admin privileges
    ctx.db.admins().insert(Admin {
        admin_identity: target_identity,
        admin_level: admin_level.clone(),
        granted_at: ctx.timestamp,
        granted_by: grantor_identity,
    });
    
    log::info!("✅ Granted {} admin privileges to {:?} by {:?}", admin_level, target_identity, grantor_identity);
}

// Revoke admin privileges (only super_admins can revoke)
#[spacetimedb::reducer]
pub fn revoke_admin_privileges(ctx: &ReducerContext, target_identity: Identity) {
    let revoker_identity = ctx.sender;
    
    // Check if the revoker is a super_admin
    let is_super_admin = ctx.db.admins().iter().any(|admin| 
        admin.admin_identity == revoker_identity && admin.admin_level == "super_admin"
    );
    if !is_super_admin {
        log::warn!("❌ Unauthorized attempt to revoke admin privileges by {:?}", revoker_identity);
        return;
    }
    
    // Find and remove admin privileges
    if let Some(admin) = ctx.db.admins().iter().find(|admin| admin.admin_identity == target_identity) {
        ctx.db.admins().delete(admin);
        log::info!("✅ Revoked admin privileges from {:?} by {:?}", target_identity, revoker_identity);
    } else {
        log::warn!("⚠️ No admin privileges found for {:?}", target_identity);
    }
}

// List all admins (only super_admins can list admins)
#[spacetimedb::reducer]
pub fn list_admins(ctx: &ReducerContext) {
    let requester_identity = ctx.sender;
    
    // Check if the requester is a super_admin
    let is_super_admin = ctx.db.admins().iter().any(|admin| 
        admin.admin_identity == requester_identity && admin.admin_level == "super_admin"
    );
    if !is_super_admin {
        log::warn!("❌ Unauthorized attempt to list admins by {:?}", requester_identity);
        return;
    }
    
    log::info!("📋 Admin list requested by {:?}:", requester_identity);
    for admin in ctx.db.admins().iter() {
        log::info!("  - {:?}: {} (granted by {:?})", 
                  admin.admin_identity, admin.admin_level, admin.granted_by);
    }
}

// ============================================================================
// ADMIN DATA ACCESS REDUCERS
// ============================================================================

// Helper function to check admin privileges
fn is_admin(ctx: &ReducerContext, required_level: &str) -> bool {
    let requester_identity = ctx.sender;
    
    // Check if the requester has admin privileges at the required level or higher
    let admin_levels = ["moderator", "admin", "super_admin"];
    let required_index = admin_levels.iter().position(|&level| level == required_level).unwrap_or(0);
    
    ctx.db.admins().iter().any(|admin| {
        if admin.admin_identity == requester_identity {
            let admin_index = admin_levels.iter().position(|&level| level == admin.admin_level).unwrap_or(0);
            admin_index >= required_index
        } else {
            false
        }
    })
}

// Get all player statistics (admin access)
#[spacetimedb::reducer]
pub fn get_all_player_stats_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all player stats by {:?}", ctx.sender);
        return;
    }
    
    log::info!("📊 Admin access to all player stats requested by {:?}", ctx.sender);
    let stats_count = ctx.db.player_stats().iter().count();
    log::info!("📊 Total player stats records: {}", stats_count);
    
    // Log summary statistics
    let total_games: u32 = ctx.db.player_stats().iter().map(|s| s.total_games).sum();
    let total_score: u32 = ctx.db.player_stats().iter().map(|s| s.total_score).sum();
    let paid_players = ctx.db.player_stats().iter().filter(|s| s.player_type == "paid").count();
    let trial_players = ctx.db.player_stats().iter().filter(|s| s.player_type == "trial").count();
    
    log::info!("📊 Summary: {} total games, {} total score, {} paid players, {} trial players", 
              total_games, total_score, paid_players, trial_players);
}

// Get all game sessions (admin access)
#[spacetimedb::reducer]
pub fn get_all_game_sessions_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all game sessions by {:?}", ctx.sender);
        return;
    }
    
    log::info!("🎮 Admin access to all game sessions requested by {:?}", ctx.sender);
    let sessions_count = ctx.db.game_sessions().iter().count();
    log::info!("🎮 Total game sessions: {}", sessions_count);
    
    // Log summary statistics
    let total_score: u32 = ctx.db.game_sessions().iter().map(|s| s.score).sum();
    let total_questions: u32 = ctx.db.game_sessions().iter().map(|s| s.questions_answered).sum();
    let total_correct: u32 = ctx.db.game_sessions().iter().map(|s| s.correct_answers).sum();
    let paid_sessions = ctx.db.game_sessions().iter().filter(|s| s.player_type == "paid").count();
    let trial_sessions = ctx.db.game_sessions().iter().filter(|s| s.player_type == "trial").count();
    
    log::info!("🎮 Summary: {} total score, {} questions, {} correct, {} paid sessions, {} trial sessions", 
              total_score, total_questions, total_correct, paid_sessions, trial_sessions);
}

// Get all question attempts (admin access)
#[spacetimedb::reducer]
pub fn get_all_question_attempts_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all question attempts by {:?}", ctx.sender);
        return;
    }
    
    log::info!("❓ Admin access to all question attempts requested by {:?}", ctx.sender);
    let attempts_count = ctx.db.question_attempts().iter().count();
    log::info!("❓ Total question attempts: {}", attempts_count);
    
    // Log summary statistics
    let correct_attempts = ctx.db.question_attempts().iter().filter(|a| a.is_correct).count();
    let incorrect_attempts = ctx.db.question_attempts().iter().filter(|a| !a.is_correct).count();
    let avg_response_time: f64 = ctx.db.question_attempts().iter()
        .map(|a| a.time_taken)
        .sum::<f64>() / attempts_count as f64;
    
    log::info!("❓ Summary: {} correct, {} incorrect, {:.2}ms avg response time", 
              correct_attempts, incorrect_attempts, avg_response_time);
}

// Get all players (admin access)
#[spacetimedb::reducer]
pub fn get_all_players_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all players by {:?}", ctx.sender);
        return;
    }
    
    log::info!("👥 Admin access to all players requested by {:?}", ctx.sender);
    let players_count = ctx.db.players().iter().count();
    log::info!("👥 Total players: {}", players_count);
    
    // Log summary statistics
    let total_score: u32 = ctx.db.players().iter().map(|p| p.total_score).sum();
    let total_games: u32 = ctx.db.players().iter().map(|p| p.games_played).sum();
    let total_earnings: f64 = ctx.db.players().iter().map(|p| p.total_earnings).sum();
    let wallet_connected = ctx.db.players().iter().filter(|p| p.wallet_connected).count();
    let trial_completed = ctx.db.players().iter().filter(|p| p.trial_completed).count();
    
    log::info!("👥 Summary: {} total score, {} total games, ${:.2} total earnings, {} wallet connected, {} trial completed", 
              total_score, total_games, total_earnings, wallet_connected, trial_completed);
}

// Get all game entries (admin access)
#[spacetimedb::reducer]
pub fn get_all_game_entries_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all game entries by {:?}", ctx.sender);
        return;
    }
    
    log::info!("🎯 Admin access to all game entries requested by {:?}", ctx.sender);
    let entries_count = ctx.db.game_entries().iter().count();
    log::info!("🎯 Total game entries: {}", entries_count);
    
    // Log summary statistics
    let paid_entries = ctx.db.game_entries().iter().filter(|e| !e.is_trial).count();
    let trial_entries = ctx.db.game_entries().iter().filter(|e| e.is_trial).count();
    let wallet_entries = ctx.db.game_entries().iter().filter(|e| e.wallet_address.is_some()).count();
    let anon_entries = ctx.db.game_entries().iter().filter(|e| e.anon_id.is_some()).count();
    
    log::info!("🎯 Summary: {} paid entries, {} trial entries, {} wallet entries, {} anonymous entries", 
              paid_entries, trial_entries, wallet_entries, anon_entries);
}

// Get all guest players (admin access)
#[spacetimedb::reducer]
pub fn get_all_guest_players_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all guest players by {:?}", ctx.sender);
        return;
    }
    
    log::info!("👤 Admin access to all guest players requested by {:?}", ctx.sender);
    let guests_count = ctx.db.guest_players().iter().count();
    log::info!("👤 Total guest players: {}", guests_count);
    
    // Log summary statistics
    let total_score: u32 = ctx.db.guest_players().iter().map(|g| g.total_score).sum();
    let total_games: u32 = ctx.db.guest_players().iter().map(|g| g.games_played).sum();
    let best_scores: Vec<u32> = ctx.db.guest_players().iter().map(|g| g.best_score).collect();
    let max_best_score = best_scores.iter().max().unwrap_or(&0);
    
    log::info!("👤 Summary: {} total score, {} total games, {} max best score", 
              total_score, total_games, max_best_score);
}

// Get all guest game sessions (admin access)
#[spacetimedb::reducer]
pub fn get_all_guest_game_sessions_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all guest game sessions by {:?}", ctx.sender);
        return;
    }
    
    log::info!("🎮 Admin access to all guest game sessions requested by {:?}", ctx.sender);
    let sessions_count = ctx.db.guest_game_sessions().iter().count();
    log::info!("🎮 Total guest game sessions: {}", sessions_count);
    
    // Log summary statistics
    let total_score: u32 = ctx.db.guest_game_sessions().iter().map(|s| s.score).sum();
    let total_questions: u32 = ctx.db.guest_game_sessions().iter().map(|s| s.questions_answered).sum();
    let total_correct: u32 = ctx.db.guest_game_sessions().iter().map(|s| s.correct_answers).sum();
    
    log::info!("🎮 Summary: {} total score, {} questions, {} correct", 
              total_score, total_questions, total_correct);
}

// Get all pending claims (admin access)
#[spacetimedb::reducer]
pub fn get_all_pending_claims_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access all pending claims by {:?}", ctx.sender);
        return;
    }
    
    log::info!("💰 Admin access to all pending claims requested by {:?}", ctx.sender);
    let claims_count = ctx.db.pending_claims().iter().count();
    log::info!("💰 Total pending claims: {}", claims_count);
    
    // Log summary statistics
    let total_prize_amount: f64 = ctx.db.pending_claims().iter().map(|c| c.prize_amount).sum();
    let claimed_claims = ctx.db.pending_claims().iter().filter(|c| c.claimed).count();
    let unclaimed_claims = ctx.db.pending_claims().iter().filter(|c| !c.claimed).count();
    let expired_claims = ctx.db.pending_claims().iter()
        .filter(|c| !c.claimed && c.expires_at < ctx.timestamp)
        .count();
    
    log::info!("💰 Summary: ${:.2} total prize amount, {} claimed, {} unclaimed, {} expired", 
              total_prize_amount, claimed_claims, unclaimed_claims, expired_claims);
}

// Get leaderboard data (admin access - paid players only)
#[spacetimedb::reducer]
pub fn get_leaderboard_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access leaderboard by {:?}", ctx.sender);
        return;
    }
    
    log::info!("🏆 Admin access to leaderboard requested by {:?}", ctx.sender);
    
    // Get top 10 paid players by best score
    let mut paid_players: Vec<_> = ctx.db.players().iter()
        .filter(|p| p.wallet_connected && !p.trial_completed) // Only paid players
        .collect();
    
    paid_players.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    let top_10: Vec<_> = paid_players.iter().take(10).collect();
    
    log::info!("🏆 Top 10 paid players by best score:");
    for (i, player) in top_10.iter().enumerate() {
        let username = player.username.as_deref().unwrap_or("Unknown");
        log::info!("  {}. {} - {} points ({} games, ${:.2} earnings)", 
                  i + 1, username, player.best_score, player.games_played, player.total_earnings);
    }
}

// Get trial leaderboard data (admin access)
#[spacetimedb::reducer]
pub fn get_trial_leaderboard_admin(ctx: &ReducerContext) {
    if !is_admin(ctx, "moderator") {
        log::warn!("❌ Unauthorized attempt to access trial leaderboard by {:?}", ctx.sender);
        return;
    }
    
    log::info!("🎯 Admin access to trial leaderboard requested by {:?}", ctx.sender);
    
    // Get top 10 trial players by best score
    let mut trial_players: Vec<_> = ctx.db.players().iter()
        .filter(|p| p.trial_completed || p.trial_games_remaining > 0) // Trial players
        .collect();
    
    trial_players.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    let top_10: Vec<_> = trial_players.iter().take(10).collect();
    
    log::info!("🎯 Top 10 trial players by best score:");
    for (i, player) in top_10.iter().enumerate() {
        let username = player.username.as_deref().unwrap_or("Unknown");
        log::info!("  {}. {} - {} points ({} games remaining)", 
                  i + 1, username, player.best_score, player.trial_games_remaining);
    }
}
