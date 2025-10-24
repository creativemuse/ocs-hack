use spacetimedb::{ReducerContext, Table, Identity, Timestamp, TimeDuration, SpacetimeType};
use std::time::Duration;

// ============================================================================
// TYPE-SAFE ENUMS
// ============================================================================

#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Eq)]
#[sats(name = "PlayerType")]
pub enum PlayerType {
    Paid,
    Trial,
}

#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Eq)]
#[sats(name = "SessionStatus")]
pub enum SessionStatus {
    Waiting,
    Active,
    Completed,
}

#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Eq)]
#[sats(name = "EntryStatus")]
pub enum EntryStatus {
    Verified,
    Consumed,
    Expired,
}

#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Eq)]
#[sats(name = "AdminLevel")]
pub enum AdminLevel {
    SuperAdmin,
    Admin,
    Moderator,
}

// ============================================================================
// OPTIMIZED TABLE DEFINITIONS WITH PRIMARY KEYS
// ============================================================================

// Audio file metadata stored in SpacetimeDB
#[spacetimedb::table(name = audio_files, public)]
#[derive(Clone)]
pub struct AudioFile {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
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
#[spacetimedb::table(name = game_sessions, public)]
#[derive(Clone)]
pub struct GameSession {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
    pub session_id: String,
    
    // Game relationship - links to contract gameId
    pub game_id: String,
    
    // HYBRID APPROACH: Track both wallet and identity
    pub wallet_address: Option<String>,     // PRIMARY for paid players
    pub guest_id: Option<String>,           // PRIMARY for trial/guest
    pub spacetime_identity: Identity,       // For connection tracking
    
    pub player_type: PlayerType,
    pub score: u32,
    pub questions_answered: u32,
    pub correct_answers: u32,
    pub started_at: Timestamp,
    pub ended_at: Option<Timestamp>,
    pub difficulty: String,
    pub game_mode: String,
}

// Active game sessions for countdown management
#[spacetimedb::table(name = active_game_sessions, public)]
#[derive(Clone)]
pub struct ActiveGameSession {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
    pub session_id: String,
    
    pub status: SessionStatus,
    pub player_count: u32,
    pub paid_player_count: u32,
    pub trial_player_count: u32,
    pub prize_pool: f64,
    pub entry_fee: f64,
    pub start_time: Timestamp,
    pub created_at: Timestamp,
}

// Player statistics stored in SpacetimeDB
// PRIMARY KEY CHANGED: wallet_address instead of Identity
#[spacetimedb::table(name = player_stats, public)]
#[derive(Clone)]
pub struct PlayerStats {
    #[primary_key]
    pub wallet_address: String,  // Changed from Identity for cross-device persistence
    
    // Track current identity for connection management
    pub current_identity: Option<Identity>,
    
    pub player_type: PlayerType,
    pub total_games: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub average_score: f64,
    pub total_questions_answered: u32,
    pub total_correct_answers: u32,
    pub last_played: Timestamp,
    pub created_at: Timestamp,
}

// Guest player data stored in SpacetimeDB
#[spacetimedb::table(name = guest_players, public)]
#[derive(Clone)]
pub struct GuestPlayer {
    #[primary_key]
    pub guest_id: String,
    
    pub name: String,
    pub player_type: PlayerType,
    pub games_played: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub achievements: String,
    pub created_at: Timestamp,
    pub last_played: Timestamp,
}

// Guest game sessions stored in SpacetimeDB
#[spacetimedb::table(name = guest_game_sessions)]
#[derive(Clone)]
pub struct GuestGameSession {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
    pub session_id: String,
    
    pub guest_id: String,
    pub player_type: PlayerType,
    pub score: u32,
    pub questions_answered: u32,
    pub correct_answers: u32,
    pub started_at: Timestamp,
    pub ended_at: Option<Timestamp>,
    pub game_data: String,
}

// Players table for wallet-connected users
#[spacetimedb::table(name = players, public)]
#[derive(Clone)]
pub struct Player {
    #[primary_key]
    pub wallet_address: String,
    
    #[unique]
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

// Identity to wallet mapping for paid players
#[spacetimedb::table(name = identity_wallet_mapping, public)]
#[derive(Clone)]
pub struct IdentityWalletMapping {
    #[primary_key]
    pub spacetime_identity: Identity,
    
    #[unique]
    pub wallet_address: String,
    
    pub linked_at: Timestamp,
    pub last_seen: Timestamp,
}

// Game entries for tracking paid/trial status
#[spacetimedb::table(name = game_entries)]
#[derive(Clone)]
pub struct GameEntry {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
    pub session_id: String,
    
    pub wallet_address: Option<String>,
    pub anon_id: Option<String>,
    pub is_trial: bool,
    pub status: EntryStatus,
    pub paid_tx_hash: Option<String>,
    pub verified_at: Timestamp,
    pub created_at: Timestamp,
}

// Anonymous sessions
#[spacetimedb::table(name = anonymous_sessions)]
#[derive(Clone)]
pub struct AnonymousSession {
    #[primary_key]
    pub session_id: String,
    
    pub games_played: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

// Prize pools
#[spacetimedb::table(name = prize_pools)]
#[derive(Clone)]
pub struct PrizePool {
    #[primary_key]
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

// Pending claims
#[spacetimedb::table(name = pending_claims, public)]
#[derive(Clone)]
pub struct PendingClaim {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    #[unique]
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

// Prize history for tracking all prize distributions
#[spacetimedb::table(name = prize_history)]
#[derive(Clone)]
pub struct PrizeHistory {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    pub wallet_address: String,
    pub session_id: String,
    pub prize_amount: f64,
    pub rank: u32,
    pub game_timestamp: Timestamp,
    pub claimed: bool,
}

// Question attempts stored in SpacetimeDB
#[spacetimedb::table(name = question_attempts)]
#[derive(Clone)]
pub struct QuestionAttempt {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    
    pub session_id: String,
    
    // HYBRID APPROACH
    pub wallet_address: Option<String>,     // For paid players
    pub guest_id: Option<String>,           // For trial/guest
    pub spacetime_identity: Identity,       // Connection tracking
    
    pub player_type: PlayerType,
    pub audio_file_id: String,
    pub selected_answer: u32,
    pub correct_answer: u32,
    pub is_correct: bool,
    pub time_taken: f64,
    pub answered_at: Timestamp,
}

// Admin table for authorized administrators
#[spacetimedb::table(name = admins)]
#[derive(Clone)]
pub struct Admin {
    #[primary_key]
    pub admin_identity: Identity,
    
    pub admin_level: AdminLevel,
    pub granted_at: Timestamp,
    pub granted_by: Identity,
}

// Active connections for real-time presence tracking
#[spacetimedb::table(name = active_connections, public)]
#[derive(Clone)]
pub struct ActiveConnection {
    #[primary_key]
    pub spacetime_identity: Identity,
    
    pub wallet_address: Option<String>,
    pub connected_at: Timestamp,
    pub last_activity: Timestamp,
}

// ============================================================================
// LIFECYCLE REDUCERS
// ============================================================================

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("🎵 Beat Me Audio Game Module initialized!");
    log::info!("✨ Schema optimized with primary keys and unique constraints");
    log::info!("⚠️ Trial players are excluded from prize pool distributions");
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    log::info!("👤 Identity connected: {:?}", identity);
    
    // Track active connection
    if ctx.db.active_connections().spacetime_identity().find(&identity).is_none() {
        ctx.db.active_connections().insert(ActiveConnection {
            spacetime_identity: identity,
            wallet_address: None,  // Will be updated when wallet links
            connected_at: ctx.timestamp,
            last_activity: ctx.timestamp,
        });
    }
    
    // Check if identity is linked to a wallet
    if let Some(mapping) = ctx.db.identity_wallet_mapping().spacetime_identity().find(&identity) {
        log::info!("🔗 Known wallet: {}", mapping.wallet_address);
        
        // Update player stats last_played
        if let Some(mut stats) = ctx.db.player_stats().wallet_address().find(&mapping.wallet_address) {
            stats.current_identity = Some(identity);
            stats.last_played = ctx.timestamp;
            ctx.db.player_stats().wallet_address().update(stats);
        }
    } else {
        log::info!("🆕 New anonymous identity (no wallet linked)");
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    log::info!("👤 Identity disconnected: {:?}", identity);
    
    // Remove from active connections
    ctx.db.active_connections().spacetime_identity().delete(&identity);
}

// ============================================================================
// GUEST PLAYER REDUCERS
// ============================================================================

#[spacetimedb::reducer]
pub fn create_guest_player(ctx: &ReducerContext, guest_id: String, name: String) {
    log::info!("👤 Creating guest player: {} ({})", name, guest_id);
    
    // Use efficient primary key lookup
    if ctx.db.guest_players().guest_id().find(&guest_id).is_none() {
        ctx.db.guest_players().insert(GuestPlayer {
            guest_id: guest_id.clone(),
            name,
            player_type: PlayerType::Trial,
            games_played: 0,
            total_score: 0,
            best_score: 0,
            achievements: "[]".to_string(),
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
    
    // Use efficient primary key update
    if let Some(mut guest) = ctx.db.guest_players().guest_id().find(&guest_id) {
        guest.games_played = games_played;
        guest.total_score = total_score;
        guest.best_score = best_score;
        guest.achievements = achievements;
        guest.last_played = ctx.timestamp;
        
        ctx.db.guest_players().guest_id().update(guest);
        log::info!("✅ Guest player updated: {} (trial)", guest_id);
    } else {
        log::warn!("❌ Guest player not found for update: {}", guest_id);
    }
}

#[spacetimedb::reducer]
pub fn record_guest_game(ctx: &ReducerContext, session_id: String, guest_id: String, score: u32, questions_answered: u32, correct_answers: u32, game_data: String) {
    log::info!("🎮 Recording guest game: {} for guest {} (score: {})", session_id, guest_id, score);
    
    ctx.db.guest_game_sessions().insert(GuestGameSession {
        id: 0,
        session_id: session_id.clone(),
        guest_id,
        player_type: PlayerType::Trial,
        score,
        questions_answered,
        correct_answers,
        started_at: ctx.timestamp,
        ended_at: Some(ctx.timestamp),
        game_data,
    });
    
    log::info!("✅ Guest game recorded: {} (trial)", session_id);
}

// ============================================================================
// AUDIO FILE MANAGEMENT
// ============================================================================

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
    
    // Check if file already exists using unique name constraint
    if ctx.db.audio_files().name().find(&name).is_some() {
        log::warn!("⚠️ Audio file already exists: {}", name);
        return;
    }
    
    let ipfs_url = format!("https://storacha.link/ipfs/{}", ipfs_cid);
    
    ctx.db.audio_files().insert(AudioFile {
        id: 0,
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

// ============================================================================
// GAME SESSION MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn start_game_session(
    ctx: &ReducerContext,
    session_id: String,
    game_id: String,                 // NEW: Links to contract gameId
    difficulty: String,
    game_mode: String,
    player_type: String,
    wallet_address: Option<String>,  // NEW: Required for paid players
    guest_id: Option<String>,        // NEW: Required for trial/guest
) {
    let identity = ctx.sender;
    let ptype = if player_type == "paid" { PlayerType::Paid } else { PlayerType::Trial };
    
    ctx.db.game_sessions().insert(GameSession {
        id: 0,
        session_id: session_id.clone(),
        game_id: game_id.clone(),    // NEW: Store the game_id
        wallet_address: wallet_address.clone(),
        guest_id: guest_id.clone(),
        spacetime_identity: identity,
        player_type: ptype,
        score: 0,
        questions_answered: 0,
        correct_answers: 0,
        started_at: ctx.timestamp,
        ended_at: None,
        difficulty,
        game_mode,
    });
    
    let player_id = wallet_address.as_deref()
        .or(guest_id.as_deref())
        .unwrap_or("unknown");
    log::info!("🎮 Started game session: {} for game {} and player {} ({:?})", session_id, game_id, player_id, ptype);
}

#[spacetimedb::reducer]
pub fn record_question_attempt(
    ctx: &ReducerContext,
    session_id: String,
    audio_file_name: String,
    selected_answer: u32,
    correct_answer: u32,
    time_taken: f64,
    player_type: String,
) {
    let identity = ctx.sender;
    let is_correct = selected_answer == correct_answer;
    let ptype = if player_type == "paid" { PlayerType::Paid } else { PlayerType::Trial };
    
    // Look up wallet/guest from session
    let (wallet_address, guest_id) = if let Some(session) = ctx.db.game_sessions().session_id().find(&session_id) {
        (session.wallet_address.clone(), session.guest_id.clone())
    } else {
        (None, None)
    };
    
    ctx.db.question_attempts().insert(QuestionAttempt {
        id: 0,
        session_id: session_id.clone(),
        wallet_address,
        guest_id,
        spacetime_identity: identity,
        player_type: ptype,
        audio_file_id: audio_file_name.clone(),
        selected_answer,
        correct_answer,
        is_correct,
        time_taken,
        answered_at: ctx.timestamp,
    });
    
    // Update game session using efficient unique index lookup
    if let Some(mut session) = ctx.db.game_sessions().session_id().find(&session_id) {
        session.score += if is_correct { 10 } else { 0 };
        session.questions_answered += 1;
        session.correct_answers += if is_correct { 1 } else { 0 };
        
        ctx.db.game_sessions().session_id().update(session);
    }
    
    log::info!("📝 Recorded question attempt: {} (correct: {}, type: {:?})", audio_file_name, is_correct, ptype);
}

#[spacetimedb::reducer]
pub fn end_game_session(ctx: &ReducerContext, session_id: String) {
    let identity = ctx.sender;
    
    // Find session
    if let Some(mut session) = ctx.db.game_sessions().session_id().find(&session_id) {
        let session_score = session.score;
        let session_questions = session.questions_answered;
        let session_correct = session.correct_answers;
        let player_type = session.player_type;
        let wallet_address = session.wallet_address.clone();
        
        session.ended_at = Some(ctx.timestamp);
        ctx.db.game_sessions().session_id().update(session);
        
        // Update stats based on player type
        match player_type {
            PlayerType::Paid => {
                // Update wallet-based stats
                if let Some(wallet) = wallet_address {
                    if let Some(mut stats) = ctx.db.player_stats().wallet_address().find(&wallet) {
                        stats.total_games += 1;
                        stats.total_score += session_score;
                        stats.best_score = std::cmp::max(stats.best_score, session_score);
                        stats.total_questions_answered += session_questions;
                        stats.total_correct_answers += session_correct;
                        stats.average_score = stats.total_score as f64 / stats.total_games as f64;
                        stats.last_played = ctx.timestamp;
                        stats.current_identity = Some(identity);
                        
                        ctx.db.player_stats().wallet_address().update(stats);
                        log::info!("✅ Updated paid player stats for {}", wallet);
                    }
                }
            }
            PlayerType::Trial => {
                // Trial players don't get persistent stats in player_stats
                log::info!("ℹ️ Trial player session ended (no persistent stats)");
            }
        }
        
        log::info!("🏁 Ended game session: {} (score: {}, type: {:?})", session_id, session_score, player_type);
    }
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

#[spacetimedb::reducer]
pub fn get_leaderboard(ctx: &ReducerContext, limit: u32) {
    // Get all paid players from Players table (has total_earnings)
    // Filter players with earnings > 0 and sort by total_earnings
    let mut paid_players: Vec<_> = ctx.db.players().iter()
        .filter(|p| p.total_earnings > 0.0)
        .collect();
    
    paid_players.sort_by(|a, b| {
        b.total_earnings.partial_cmp(&a.total_earnings)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    
    log::info!("🏆 Earnings Leaderboard (top {} paid players by USDC):", limit);
    for (i, player) in paid_players.iter().take(limit as usize).enumerate() {
        let username = player.username.as_deref().unwrap_or(&player.wallet_address);
        log::info!("  {}. {}: ${:.2} USDC ({} games)", 
            i + 1, username, player.total_earnings, player.games_played);
    }
}

#[spacetimedb::reducer]
pub fn get_trial_leaderboard(ctx: &ReducerContext, limit: u32) {
    // Trial players use guest_players table, sorted by best score
    let mut guests: Vec<_> = ctx.db.guest_players().iter().collect();
    guests.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    
    log::info!("🏆 Trial leaderboard (top {} guests by score, no prizes):", limit);
    for (i, guest) in guests.iter().take(limit as usize).enumerate() {
        log::info!("  {}. {}: {} best score", i + 1, guest.name, guest.best_score);
    }
}

// ============================================================================
// ACTIVE GAME SESSION MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn get_active_game_session(ctx: &ReducerContext) {
    // Find active or waiting session
    let active_session = ctx.db.active_game_sessions().iter()
        .filter(|s| matches!(s.status, SessionStatus::Active | SessionStatus::Waiting))
        .max_by_key(|s| s.created_at);
    
    if let Some(session) = active_session {
        log::info!("🎮 Active game session found: {} (status: {:?}, paid: {}, trial: {})", 
                  session.session_id, session.status, session.paid_player_count, session.trial_player_count);
    } else {
        log::info!("🎮 No active game session found, creating new one");
        let new_session_id = format!("session_{}", ctx.timestamp);
        ctx.db.active_game_sessions().insert(ActiveGameSession {
            id: 0,
            session_id: new_session_id.clone(),
            status: SessionStatus::Waiting,
            player_count: 0,
            paid_player_count: 0,
            trial_player_count: 0,
            prize_pool: 0.0,
            entry_fee: 1.0,
            start_time: ctx.timestamp,
            created_at: ctx.timestamp,
        });
        log::info!("✅ Created new waiting session: {}", new_session_id);
    }
}

#[spacetimedb::reducer]
pub fn join_active_game_session(ctx: &ReducerContext, player_type: String) {
    let ptype = if player_type == "paid" { PlayerType::Paid } else { PlayerType::Trial };
    
    // Find active or waiting session
    let active_session = ctx.db.active_game_sessions().iter()
        .filter(|s| matches!(s.status, SessionStatus::Active | SessionStatus::Waiting))
        .max_by_key(|s| s.created_at);
    
    if let Some(mut session) = active_session {
        let is_first_player = session.player_count == 0;
        
        if is_first_player {
            session.status = SessionStatus::Active;
            session.start_time = ctx.timestamp;
        }
        
        session.player_count += 1;
        
        match ptype {
            PlayerType::Paid => {
                session.paid_player_count += 1;
                session.prize_pool += session.entry_fee;
            }
            PlayerType::Trial => {
                session.trial_player_count += 1;
            }
        }
        
        let session_id = session.session_id.clone();
        let player_count = session.player_count;
        
        // Use efficient primary key update
        ctx.db.active_game_sessions().id().update(session);
        
        if is_first_player {
            log::info!("🎮 First player joined session: {} (starting countdown, type: {:?})", session_id, ptype);
        } else {
            log::info!("🎮 Player joined session: {} (total: {}, type: {:?})", session_id, player_count, ptype);
        }
    } else {
        log::warn!("⚠️ No active session found to join");
    }
}

#[spacetimedb::reducer]
pub fn update_player_type(ctx: &ReducerContext, wallet_address: String, new_type: String) {
    let identity = ctx.sender;
    let ptype = if new_type == "paid" { PlayerType::Paid } else { PlayerType::Trial };
    
    // Update player stats using wallet address
    if let Some(mut stats) = ctx.db.player_stats().wallet_address().find(&wallet_address) {
        let old_type = stats.player_type;
        stats.player_type = ptype;
        stats.current_identity = Some(identity);
        ctx.db.player_stats().wallet_address().update(stats);
        log::info!("🔄 Updated player type for {}: {:?} → {:?}", wallet_address, old_type, ptype);
    } else {
        // Create new stats if doesn't exist
        ctx.db.player_stats().insert(PlayerStats {
            wallet_address: wallet_address.clone(),
            current_identity: Some(identity),
            player_type: ptype,
            total_games: 0,
            total_score: 0,
            best_score: 0,
            average_score: 0.0,
            total_questions_answered: 0,
            total_correct_answers: 0,
            last_played: ctx.timestamp,
            created_at: ctx.timestamp,
        });
        log::info!("✅ Created new player stats for {}: {:?}", wallet_address, ptype);
    }
}

// ============================================================================
// PLAYER MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn create_player(ctx: &ReducerContext, wallet_address: String, username: Option<String>) {
    log::info!("👤 Creating player: {} ({})", wallet_address, username.as_deref().unwrap_or("no username"));
    
    // Use efficient primary key lookup
    if ctx.db.players().wallet_address().find(&wallet_address).is_none() {
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

/// Link current SpacetimeDB identity to a wallet address
/// This enables paid player stats to persist across devices/browsers
#[spacetimedb::reducer]
pub fn link_wallet_to_identity(
    ctx: &ReducerContext,
    wallet_address: String,
) {
    let identity = ctx.sender;
    log::info!("🔗 Linking wallet {} to identity {:?}", wallet_address, identity);
    
    // Check if this identity is already linked
    if let Some(existing_mapping) = ctx.db.identity_wallet_mapping().spacetime_identity().find(&identity) {
        if existing_mapping.wallet_address != wallet_address {
            log::warn!("⚠️ Identity {:?} already linked to {}", identity, existing_mapping.wallet_address);
            return;
        }
        // Same wallet, just update last_seen
        let mut mapping = existing_mapping;
        mapping.last_seen = ctx.timestamp;
        ctx.db.identity_wallet_mapping().spacetime_identity().update(mapping);
        log::info!("✅ Updated existing link for {}", wallet_address);
        return;
    }
    
    // Check if this wallet is already linked to a different identity
    if let Some(existing_mapping) = ctx.db.identity_wallet_mapping().wallet_address().find(&wallet_address) {
        log::info!("🔄 Wallet {} was linked to {:?}, updating to {:?}", wallet_address, existing_mapping.spacetime_identity, identity);
        // Delete old mapping
        ctx.db.identity_wallet_mapping().spacetime_identity().delete(&existing_mapping.spacetime_identity);
    }
    
    // Create new mapping
    ctx.db.identity_wallet_mapping().insert(IdentityWalletMapping {
        spacetime_identity: identity,
        wallet_address: wallet_address.clone(),
        linked_at: ctx.timestamp,
        last_seen: ctx.timestamp,
    });
    
    // Update active connection with wallet
    if let Some(mut conn) = ctx.db.active_connections().spacetime_identity().find(&identity) {
        conn.wallet_address = Some(wallet_address.clone());
        ctx.db.active_connections().spacetime_identity().update(conn);
    }
    
    // Initialize or update player stats for this wallet
    match ctx.db.player_stats().wallet_address().find(&wallet_address) {
        Some(mut stats) => {
            // Update existing stats with new identity
            stats.current_identity = Some(identity);
            stats.last_played = ctx.timestamp;
            ctx.db.player_stats().wallet_address().update(stats);
            log::info!("✅ Updated existing stats for {}", wallet_address);
        }
        None => {
            // Create new stats entry
            ctx.db.player_stats().insert(PlayerStats {
                wallet_address: wallet_address.clone(),
                current_identity: Some(identity),
                player_type: PlayerType::Paid,  // Wallet = paid player
                total_games: 0,
                total_score: 0,
                best_score: 0,
                average_score: 0.0,
                total_questions_answered: 0,
                total_correct_answers: 0,
                last_played: ctx.timestamp,
                created_at: ctx.timestamp,
            });
            log::info!("✅ Created new stats for {}", wallet_address);
        }
    }
    
    log::info!("✅ Successfully linked wallet {} to identity {:?}", wallet_address, identity);
}

#[spacetimedb::reducer]
pub fn update_player_stats(ctx: &ReducerContext, wallet_address: String, total_score: u32, games_played: u32, best_score: u32, total_earnings: f64) {
    log::info!("📊 Updating player stats: {} (score: {}, games: {}, best: {})", wallet_address, total_score, games_played, best_score);
    
    // Use efficient primary key lookup and atomic update
    if let Some(mut player) = ctx.db.players().wallet_address().find(&wallet_address) {
        player.total_score = total_score;
        player.games_played = games_played;
        player.best_score = best_score;
        player.total_earnings = total_earnings;
        player.updated_at = ctx.timestamp;
        
        ctx.db.players().wallet_address().update(player);
        log::info!("✅ Player stats updated: {}", wallet_address);
    } else {
        log::warn!("❌ Player not found for update: {}", wallet_address);
    }
}

#[spacetimedb::reducer]
pub fn update_trial_status(ctx: &ReducerContext, wallet_address: String, trial_games_remaining: u32, trial_completed: bool) {
    log::info!("🎯 Updating trial status: {} (remaining: {}, completed: {})", wallet_address, trial_games_remaining, trial_completed);
    
    // Use efficient primary key lookup and atomic update
    if let Some(mut player) = ctx.db.players().wallet_address().find(&wallet_address) {
        player.trial_games_remaining = trial_games_remaining;
        player.trial_completed = trial_completed;
        player.updated_at = ctx.timestamp;
        
        ctx.db.players().wallet_address().update(player);
        log::info!("✅ Trial status updated: {}", wallet_address);
    } else {
        log::warn!("❌ Player not found for trial update: {}", wallet_address);
    }
}

// ============================================================================
// GAME ENTRY MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn create_game_entry(ctx: &ReducerContext, session_id: String, wallet_address: Option<String>, anon_id: Option<String>, is_trial: bool, paid_tx_hash: Option<String>) {
    log::info!("🎮 Creating game entry: {} (wallet: {:?}, anon: {:?}, trial: {})", session_id, wallet_address, anon_id, is_trial);
    
    ctx.db.game_entries().insert(GameEntry {
        id: 0,
        session_id: session_id.clone(),
        wallet_address,
        anon_id,
        is_trial,
        status: EntryStatus::Verified,
        paid_tx_hash,
        verified_at: ctx.timestamp,
        created_at: ctx.timestamp,
    });
    
    log::info!("✅ Game entry created: {}", session_id);
}

#[spacetimedb::reducer]
pub fn mark_entry_consumed(ctx: &ReducerContext, session_id: String) {
    log::info!("✅ Marking game entry as consumed: {}", session_id);
    
    // Use efficient unique index lookup and update
    if let Some(mut entry) = ctx.db.game_entries().session_id().find(&session_id) {
        entry.status = EntryStatus::Consumed;
        ctx.db.game_entries().session_id().update(entry);
        log::info!("✅ Game entry marked as consumed: {}", session_id);
    } else {
        log::warn!("❌ Game entry not found: {}", session_id);
    }
}

// ============================================================================
// ANONYMOUS SESSION MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn create_anonymous_session(ctx: &ReducerContext, session_id: String) {
    log::info!("👤 Creating anonymous session: {}", session_id);
    
    // Use efficient primary key lookup
    if ctx.db.anonymous_sessions().session_id().find(&session_id).is_none() {
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
    
    // Use efficient primary key lookup and atomic update
    if let Some(mut session) = ctx.db.anonymous_sessions().session_id().find(&session_id) {
        session.games_played = games_played;
        session.total_score = total_score;
        session.best_score = best_score;
        session.updated_at = ctx.timestamp;
        
        ctx.db.anonymous_sessions().session_id().update(session);
        log::info!("✅ Anonymous session updated: {}", session_id);
    } else {
        log::warn!("❌ Anonymous session not found: {}", session_id);
    }
}

// ============================================================================
// PRIZE MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn create_prize_pool(ctx: &ReducerContext, game_id: String, entry_fee: f64) {
    log::info!("💰 Creating prize pool: {} (entry fee: {})", game_id, entry_fee);
    
    let expires_at = ctx.timestamp + TimeDuration::from_duration(Duration::from_secs(24 * 60 * 60));
    
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
pub fn record_prize_distribution(
    ctx: &ReducerContext,
    wallet_address: String,
    session_id: String,
    prize_amount: f64,
    rank: u32,
) {
    log::info!("💰 Recording prize: {} USDC for {} (rank: {})", prize_amount, wallet_address, rank);
    
    ctx.db.prize_history().insert(PrizeHistory {
        id: 0,
        wallet_address: wallet_address.clone(),
        session_id,
        prize_amount,
        rank,
        game_timestamp: ctx.timestamp,
        claimed: false,
    });
    
    // Update player's total_earnings using efficient primary key lookup
    if let Some(mut player) = ctx.db.players().wallet_address().find(&wallet_address) {
        player.total_earnings += prize_amount;
        player.updated_at = ctx.timestamp;
        let updated_earnings = player.total_earnings;
        
        ctx.db.players().wallet_address().update(player);
        log::info!("✅ Updated total earnings for {} to ${:.2}", wallet_address, updated_earnings);
    } else {
        log::warn!("⚠️ Player not found: {}", wallet_address);
    }
}

#[spacetimedb::reducer]
pub fn get_top_earners(ctx: &ReducerContext, limit: u32) {
    // Filter players with earnings > 0 and sort
    let mut players: Vec<_> = ctx.db.players().iter()
        .filter(|p| p.total_earnings > 0.0)
        .collect();
    
    players.sort_by(|a, b| {
        b.total_earnings.partial_cmp(&a.total_earnings)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    
    log::info!("🏆 Top {} earners:", limit);
    for (i, player) in players.iter().take(limit as usize).enumerate() {
        let username = player.username.as_deref().unwrap_or(&player.wallet_address);
        log::info!("  {}. {} - ${:.2} USDC", i + 1, username, player.total_earnings);
    }
}

// ============================================================================
// ADMIN MANAGEMENT
// ============================================================================

fn is_admin(ctx: &ReducerContext, required_level: &AdminLevel) -> bool {
    let requester_identity = ctx.sender;
    
    ctx.db.admins().admin_identity()
        .find(&requester_identity)
        .map(|admin| match (&admin.admin_level, required_level) {
            (AdminLevel::SuperAdmin, _) => true,
            (AdminLevel::Admin, AdminLevel::Admin) | (AdminLevel::Admin, AdminLevel::Moderator) => true,
            (AdminLevel::Moderator, AdminLevel::Moderator) => true,
            _ => false,
        })
        .unwrap_or(false)
}

#[spacetimedb::reducer]
pub fn grant_admin_privileges(ctx: &ReducerContext, target_identity: Identity, admin_level: String) {
    let grantor_identity = ctx.sender;
    let level = match admin_level.as_str() {
        "super_admin" => AdminLevel::SuperAdmin,
        "admin" => AdminLevel::Admin,
        _ => AdminLevel::Moderator,
    };
    
    // Use efficient primary key lookup
    let is_grantor_admin = ctx.db.admins().admin_identity().find(&grantor_identity).is_some();
    let is_first_admin = ctx.db.admins().iter().count() == 0;
    
    if !is_grantor_admin && !is_first_admin {
        log::warn!("❌ Unauthorized attempt to grant admin privileges by {:?}", grantor_identity);
        return;
    }
    
    if ctx.db.admins().admin_identity().find(&target_identity).is_some() {
        log::warn!("⚠️ Admin privileges already exist for {:?}", target_identity);
        return;
    }
    
    ctx.db.admins().insert(Admin {
        admin_identity: target_identity,
        admin_level: level,
        granted_at: ctx.timestamp,
        granted_by: grantor_identity,
    });
    
    log::info!("✅ Granted {:?} admin privileges to {:?} by {:?}", level, target_identity, grantor_identity);
}

#[spacetimedb::reducer]
pub fn revoke_admin_privileges(ctx: &ReducerContext, target_identity: Identity) {
    let revoker_identity = ctx.sender;
    
    if !is_admin(ctx, &AdminLevel::SuperAdmin) {
        log::warn!("❌ Unauthorized attempt to revoke admin privileges by {:?}", revoker_identity);
        return;
    }
    
    // Use efficient primary key lookup and delete
    if ctx.db.admins().admin_identity().find(&target_identity).is_some() {
        ctx.db.admins().admin_identity().delete(&target_identity);
        log::info!("✅ Revoked admin privileges from {:?} by {:?}", target_identity, revoker_identity);
    } else {
        log::warn!("⚠️ No admin privileges found for {:?}", target_identity);
    }
}
