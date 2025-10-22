# Row Level Security (RLS) Implementation

## Overview

This document describes the Row Level Security (RLS) implementation for the Beat Me Audio Game SpaceTimeDB module. RLS ensures that users can only access data they are authorized to see, providing robust data isolation and security.

## Features Enabled

### 1. RLS Feature Activation
- Enabled the `unstable` feature in `Cargo.toml` to access RLS functionality
- Added necessary imports for `client_visibility_filter` and `Filter`

### 2. Player-Specific Data Filters

#### Player Stats
- **Filter**: `PLAYER_STATS_FILTER`
- **Access**: Players can only see their own statistics
- **SQL**: `SELECT * FROM player_stats WHERE player_stats.player_identity = :sender`

#### Game Sessions
- **Filter**: `GAME_SESSIONS_FILTER`
- **Access**: Players can only see their own game sessions
- **SQL**: `SELECT * FROM game_sessions WHERE game_sessions.player_identity = :sender`

#### Question Attempts
- **Filter**: `QUESTION_ATTEMPTS_FILTER`
- **Access**: Players can only see their own question attempts
- **SQL**: `SELECT * FROM question_attempts WHERE question_attempts.player_identity = :sender`

#### Players Table
- **Filter**: `PLAYERS_FILTER`
- **Access**: Players can only see their own player record
- **SQL**: `SELECT * FROM players WHERE players.wallet_address = :sender`

#### Game Entries
- **Filter**: `GAME_ENTRIES_FILTER`
- **Access**: Players can see entries for their wallet address or anonymous ID
- **SQL**: `SELECT * FROM game_entries WHERE game_entries.wallet_address = :sender OR game_entries.anon_id = :sender`

#### Pending Claims
- **Filter**: `PENDING_CLAIMS_FILTER`
- **Access**: Players can only see their own pending claims
- **SQL**: `SELECT * FROM pending_claims WHERE pending_claims.wallet_address = :sender`

### 3. Guest Player Data Isolation

#### Guest Players
- **Filter**: `GUEST_PLAYERS_FILTER`
- **Access**: Guest players can only see their own data
- **SQL**: `SELECT * FROM guest_players WHERE guest_players.guest_id = :sender`

#### Guest Game Sessions
- **Filter**: `GUEST_GAME_SESSIONS_FILTER`
- **Access**: Guest players can only see their own game sessions
- **SQL**: `SELECT * FROM guest_game_sessions WHERE guest_game_sessions.guest_id = :sender`

### 4. Admin Access Controls

#### Admin Table
- **Structure**: Stores admin identities with permission levels
- **Levels**: `super_admin`, `admin`, `moderator`
- **Tracking**: Records who granted privileges and when

#### Admin Filters for Global Data Access
- **Leaderboard Access**: `LEADERBOARD_ADMIN_FILTER` (paid players only)
- **Trial Leaderboard**: `TRIAL_LEADERBOARD_ADMIN_FILTER`
- **All Player Stats**: `ALL_PLAYER_STATS_ADMIN_FILTER`
- **All Game Sessions**: `ALL_GAME_SESSIONS_ADMIN_FILTER`
- **All Question Attempts**: `ALL_QUESTION_ATTEMPTS_ADMIN_FILTER`
- **All Players**: `ALL_PLAYERS_ADMIN_FILTER`
- **All Game Entries**: `ALL_GAME_ENTRIES_ADMIN_FILTER`
- **All Guest Players**: `ALL_GUEST_PLAYERS_ADMIN_FILTER`
- **All Guest Game Sessions**: `ALL_GUEST_GAME_SESSIONS_ADMIN_FILTER`
- **All Pending Claims**: `ALL_PENDING_CLAIMS_ADMIN_FILTER`

### 5. Public Data (No RLS Filtering)

The following tables remain publicly accessible as they contain data needed for game functionality:

- **Audio Files**: Required for game questions
- **Active Game Sessions**: Needed for players to join games
- **Prize Pools**: Public information about prizes
- **Anonymous Sessions**: Already isolated by session_id in application logic

## Admin Management

### Admin Privilege Management
- **Grant Privileges**: `grant_admin_privileges(target_identity, admin_level)`
- **Revoke Privileges**: `revoke_admin_privileges(target_identity)`
- **List Admins**: `list_admins()`

### Permission Hierarchy
1. **super_admin**: Can grant/revoke all privileges and access all data
2. **admin**: Can grant lower-level privileges and access most data
3. **moderator**: Limited access for moderation tasks

### Security Features
- Only existing admins can grant new privileges
- Only super_admins can revoke privileges
- All admin actions are logged with timestamps and grantor information

## Implementation Details

### RLS Filter Syntax
```rust
#[client_visibility_filter]
const FILTER_NAME: Filter = Filter::Sql(
    "SELECT * FROM table_name WHERE condition = :sender"
);
```

### Key Parameters
- `:sender`: Automatically bound to the requesting client's Identity
- Multiple rules per table are evaluated as logical OR
- Recursive application ensures data is never leaked through indirect access

### Best Practices Implemented
1. **Use :sender for client-specific filtering**: All player filters use the sender's identity
2. **Follow SQL best practices**: Optimized queries for performance
3. **Multiple rules per table**: Admin and player access rules coexist
4. **Recursive application**: RLS rules apply to joined tables automatically

## Security Benefits

### Data Isolation
- Players cannot access other players' personal data
- Guest players are completely isolated
- Admin access is controlled and logged

### Privacy Protection
- Game statistics are private to each player
- Question attempts and performance data are confidential
- Financial information (pending claims) is protected

### Access Control
- Hierarchical admin permissions
- Granular control over data access
- Audit trail for all admin actions

## Usage Examples

### Player Data Access
When a player queries their stats, they automatically only see their own data:
```typescript
const stats = await spacetimeClient.getPlayerStats();
// Returns only the requesting player's stats due to RLS
```

### Admin Data Access
Admins can access global data for moderation:
```typescript
const allStats = await spacetimeClient.call('get_all_player_stats_admin', []);
// Returns all player stats for admin users
```

### Guest Player Access
Guest players are isolated to their own data:
```typescript
const guestData = await spacetimeClient.query('SELECT * FROM guest_players', []);
// Returns only the requesting guest player's data
```

## Migration Notes

### Breaking Changes
- **Data Access**: Existing queries may return different results due to filtering
- **API Behavior**: Some endpoints may need updates to handle filtered data
- **Admin Setup**: Initial admin users must be created through the grant_admin_privileges reducer

### Required Updates
1. **API Endpoints**: Update to work with RLS-filtered data
2. **Frontend**: Ensure UI handles filtered data correctly
3. **Testing**: Update tests to account for RLS restrictions
4. **Admin Setup**: Create initial admin users after deployment

## Future Enhancements

### Potential Improvements
1. **Time-based Access**: Add expiration for temporary admin privileges
2. **Resource-specific Permissions**: Granular control over specific data resources
3. **Audit Logging**: Enhanced logging for all data access attempts
4. **Performance Optimization**: Index optimization for RLS queries

### Monitoring
- Monitor RLS query performance
- Track admin privilege usage
- Audit data access patterns
- Monitor for unauthorized access attempts

## Conclusion

The RLS implementation provides comprehensive data security and isolation for the Beat Me Audio Game. Players can only access their own data, admins have controlled access to global information, and guest players are completely isolated. This ensures privacy, security, and proper access control throughout the application.
