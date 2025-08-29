use spacetimedb::{ReducerContext, Table, Identity, Timestamp};

// Audio file metadata stored in SpacetimeDB
#[spacetimedb::table(name = audio_files)]
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
pub struct GameSession {
    pub session_id: String,
    pub player_identity: Identity,
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
pub struct ActiveGameSession {
    pub session_id: String,
    pub status: String, // "waiting", "active", "completed"
    pub player_count: u32,
    pub prize_pool: f64,
    pub entry_fee: f64,
    pub start_time: Timestamp,
    pub created_at: Timestamp,
}

// Player statistics stored in SpacetimeDB
#[spacetimedb::table(name = player_stats)]
pub struct PlayerStats {
    pub player_identity: Identity,
    pub total_games: u32,
    pub total_score: u32,
    pub best_score: u32,
    pub average_score: f64,
    pub total_questions_answered: u32,
    pub total_correct_answers: u32,
    pub last_played: Timestamp,
}

// Question attempts stored in SpacetimeDB
#[spacetimedb::table(name = question_attempts)]
pub struct QuestionAttempt {
    pub session_id: String,
    pub player_identity: Identity,
    pub audio_file_id: String,
    pub selected_answer: u32,
    pub correct_answer: u32,
    pub is_correct: bool,
    pub time_taken: f64,
    pub answered_at: Timestamp,
}

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("🎵 Beat Me Audio Game Module initialized!");
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
            total_games: 0,
            total_score: 0,
            best_score: 0,
            average_score: 0.0,
            total_questions_answered: 0,
            total_correct_answers: 0,
            last_played: ctx.timestamp,
        });
        log::info!("📊 Initialized stats for new player: {:?}", identity);
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender;
    log::info!("👤 Player disconnected: {:?}", identity);
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
) {
    let identity = ctx.sender;
    
    ctx.db.game_sessions().insert(GameSession {
        session_id: session_id.clone(),
        player_identity: identity,
        score: 0,
        questions_answered: 0,
        correct_answers: 0,
        started_at: ctx.timestamp,
        ended_at: None,
        difficulty,
        game_mode,
    });
    
    log::info!("🎮 Started game session: {} for player {:?}", session_id, identity);
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
) {
    let identity = ctx.sender;
    let is_correct = selected_answer == correct_answer;
    
    ctx.db.question_attempts().insert(QuestionAttempt {
        session_id: session_id.clone(),
        player_identity: identity,
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
    
    log::info!("📝 Recorded question attempt: {} (correct: {})", audio_file_name, is_correct);
}

// End a game session
#[spacetimedb::reducer]
pub fn end_game_session(ctx: &ReducerContext, session_id: String) {
    let identity = ctx.sender;
    
    if let Some(session) = ctx.db.game_sessions().iter().find(|s| s.session_id == session_id) {
        let session_score = session.score;
        let session_questions = session.questions_answered;
        let session_correct = session.correct_answers;
        
        // Clone session data before deleting
        let session_data = GameSession {
            session_id: session.session_id.clone(),
            player_identity: session.player_identity,
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
                total_games: new_total_games,
                total_score: new_total_score,
                best_score: new_best_score,
                average_score: new_average,
                total_questions_answered: new_total_questions,
                total_correct_answers: new_total_correct,
                last_played: ctx.timestamp,
            });
        }
        
        log::info!("🏁 Ended game session: {} (score: {})", session_id, session_score);
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
        log::info!("📊 Player stats for {:?}: {} games, {} total score, {} best score", 
                  identity, stats.total_games, stats.total_score, stats.best_score);
    } else {
        log::info!("📊 No stats found for player {:?}", identity);
    }
}

// Get leaderboard (simplified - just log the request)
#[spacetimedb::reducer]
pub fn get_leaderboard(ctx: &ReducerContext, limit: u32) {
    let mut stats: Vec<_> = ctx.db.player_stats().iter().collect();
    stats.sort_by(|a, b| b.best_score.cmp(&a.best_score));
    
    log::info!("🏆 Leaderboard request (top {}):", limit);
    for (i, stat) in stats.iter().take(limit as usize).enumerate() {
        log::info!("  {}. Player {:?}: {} best score", i + 1, stat.player_identity, stat.best_score);
    }
}

// Get current active game session
#[spacetimedb::reducer]
pub fn get_active_game_session(ctx: &ReducerContext) {
    let identity = ctx.sender;
    
    // Find the most recent active session
    let active_session = ctx.db.active_game_sessions().iter()
        .filter(|s| s.status == "active" || s.status == "waiting")
        .max_by_key(|s| s.created_at);
    
    if let Some(session) = active_session {
        log::info!("🎮 Active game session found: {} (status: {}, players: {})", 
                  session.session_id, session.status, session.player_count);
    } else {
        log::info!("🎮 No active game session found, creating new one");
        // Create a new waiting session
        let new_session_id = format!("session_{}", ctx.timestamp);
        ctx.db.active_game_sessions().insert(ActiveGameSession {
            session_id: new_session_id.clone(),
            status: "waiting".to_string(),
            player_count: 0,
            prize_pool: 100.0,
            entry_fee: 1.0,
            start_time: ctx.timestamp,
            created_at: ctx.timestamp,
        });
        log::info!("✅ Created new waiting session: {}", new_session_id);
    }
}

// Join active game session
#[spacetimedb::reducer]
pub fn join_active_game_session(ctx: &ReducerContext) {
    let identity = ctx.sender;
    
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
        let session_created_at = session.created_at;
        let prize_pool = session.prize_pool;
        let entry_fee = session.entry_fee;
        
        // Update the session
        ctx.db.active_game_sessions().delete(session);
        ctx.db.active_game_sessions().insert(ActiveGameSession {
            session_id: session_id_clone.clone(),
            status: new_status,
            player_count: previous_player_count + 1,
            prize_pool,
            entry_fee,
            start_time: new_start_time,
            created_at: session_created_at,
        });
        
        if is_first_player {
            log::info!("🎮 First player joined session: {} (starting countdown)", session_id_clone);
        } else {
            log::info!("🎮 Player joined session: {} (total players: {})", 
                      session_id_clone, previous_player_count + 1);
        }
    } else {
        log::warn!("⚠️ No active session found to join");
    }
}
