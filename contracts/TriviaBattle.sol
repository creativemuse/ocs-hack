// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TriviaBattle
 * @dev Smart contract for handling trivia game entry fees and prize distribution
 * 
 * PRIZE POOL POLICY:
 * - Only paid players (who paid 1 USDC entry fee) are eligible for prize pool distributions
 * - Trial players can participate in games but cannot win prizes from the prize pool
 * - This prevents abuse of the trial system for free prize pool access
 * 
 * USDC Addresses:
 * - Base Mainnet: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
 * - Base Sepolia: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
 */
contract TriviaBattle is ReentrancyGuard, Ownable {
    // USDC token contract
    IERC20 public immutable usdcToken;
    
    // Entry fee in USDC (1 USDC = 1,000,000 wei for 6 decimals)
    uint256 public constant ENTRY_FEE = 1_000_000; // 1 USDC
    
    // Platform fee in basis points (2.5% = 250 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    
    // Platform fee recipient address
    address public platformFeeRecipient;
    
    // Game session structure
    struct GameSession {
        uint256 startTime;
        uint256 endTime;
        uint256 prizePool;
        uint256 paidPlayerCount;
        uint256 trialPlayerCount;
        bool isActive;
        bool prizesDistributed;
        mapping(address => PlayerScore) playerScores;
        mapping(string => TrialPlayerScore) trialPlayerScores; // sessionId => score
        address[] paidPlayers;
        string[] trialPlayers;
    }
    
    struct PlayerScore {
        uint256 score;
        bool hasSubmitted;
        uint256 submissionTime;
    }
    
    struct TrialPlayerScore {
        uint256 score;
        bool hasSubmitted;
        uint256 submissionTime;
    }
    
    // Current active game session
    GameSession public currentSession;
    
    // Events
    event PlayerJoined(address indexed player, uint256 entryFee, uint256 platformFee);
    event TrialPlayerJoined(string indexed sessionId);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp);
    event TrialScoreSubmitted(string indexed sessionId, uint256 score, uint256 timestamp);
    event PrizesDistributed(
        uint256 sessionId,
        address[] winners,
        uint256[] amounts
    );
    event SessionStarted(uint256 startTime, uint256 duration);
    event SessionEnded(uint256 endTime);
    event PlatformFeeCollected(uint256 amount, address indexed recipient);
    event PlatformFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    
    // Modifiers
    modifier onlyActiveSession() {
        require(currentSession.isActive, "No active session");
        require(block.timestamp >= currentSession.startTime, "Session not started");
        require(block.timestamp <= currentSession.endTime, "Session ended");
        _;
    }
    
    modifier onlySessionEnded() {
        require(!currentSession.isActive || block.timestamp > currentSession.endTime, "Session still active");
        _;
    }
    
    constructor(address _usdcToken, address _platformFeeRecipient) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        platformFeeRecipient = _platformFeeRecipient;
    }
    
    /**
     * @dev Start a new game session (only owner)
     * @param duration Duration of the session in seconds (300 = 5 minutes)
     */
    function startSession(uint256 duration) external onlyOwner {
        require(!currentSession.isActive, "Session already active");
        require(duration > 0, "Invalid duration");
        
        // Reset current session
        delete currentSession;
        
        currentSession.startTime = block.timestamp;
        currentSession.endTime = block.timestamp + duration;
        currentSession.isActive = true;
        currentSession.prizesDistributed = false;
        
        emit SessionStarted(currentSession.startTime, duration);
    }
    
    /**
     * @dev Join battle as a paid player (requires 1 USDC entry fee)
     * Only paid players are eligible for prize pool distributions
     * Platform fee of 2.5% is deducted from entry fee
     */
    function joinBattle() external nonReentrant onlyActiveSession {
        require(currentSession.playerScores[msg.sender].score == 0, "Already joined");
        
        // Calculate platform fee (2.5% of entry fee)
        uint256 platformFee = (ENTRY_FEE * PLATFORM_FEE_BPS) / 10000;
        uint256 prizePoolContribution = ENTRY_FEE - platformFee;
        
        // Transfer USDC entry fee
        require(
            usdcToken.transferFrom(msg.sender, address(this), ENTRY_FEE),
            "USDC transfer failed"
        );
        
        // Transfer platform fee to recipient
        if (platformFee > 0 && platformFeeRecipient != address(0)) {
            require(
                usdcToken.transfer(platformFeeRecipient, platformFee),
                "Platform fee transfer failed"
            );
            emit PlatformFeeCollected(platformFee, platformFeeRecipient);
        }
        
        // Add remaining amount to prize pool
        currentSession.prizePool += prizePoolContribution;
        currentSession.paidPlayerCount++;
        currentSession.paidPlayers.push(msg.sender);
        
        // Initialize player score
        currentSession.playerScores[msg.sender] = PlayerScore({
            score: 0,
            hasSubmitted: false,
            submissionTime: 0
        });
        
        emit PlayerJoined(msg.sender, ENTRY_FEE, platformFee);
    }
    
    /**
     * @dev Join battle as a trial player (no entry fee required)
     * Trial players can participate but are NOT eligible for prize pool distributions
     * @param sessionId Unique session identifier for trial player
     */
    function joinTrialBattle(string calldata sessionId) external onlyActiveSession {
        require(bytes(sessionId).length > 0, "Invalid session ID");
        require(currentSession.trialPlayerScores[sessionId].score == 0, "Session ID already used");
        
        currentSession.trialPlayerCount++;
        currentSession.trialPlayers.push(sessionId);
        
        // Initialize trial player score
        currentSession.trialPlayerScores[sessionId] = TrialPlayerScore({
            score: 0,
            hasSubmitted: false,
            submissionTime: 0
        });
        
        emit TrialPlayerJoined(sessionId);
    }
    
    /**
     * @dev Submit score for paid player
     * @param score Player's final score
     */
    function submitScore(uint256 score) external onlyActiveSession {
        require(currentSession.playerScores[msg.sender].score > 0, "Player not joined");
        require(!currentSession.playerScores[msg.sender].hasSubmitted, "Score already submitted");
        
        currentSession.playerScores[msg.sender].score = score;
        currentSession.playerScores[msg.sender].hasSubmitted = true;
        currentSession.playerScores[msg.sender].submissionTime = block.timestamp;
        
        emit ScoreSubmitted(msg.sender, score, block.timestamp);
    }
    
    /**
     * @dev Submit score for trial player
     * Trial players can submit scores but are not eligible for prizes
     * @param sessionId Trial player's session ID
     * @param score Player's final score
     */
    function submitTrialScore(string calldata sessionId, uint256 score) external onlyActiveSession {
        require(currentSession.trialPlayerScores[sessionId].score > 0, "Trial player not joined");
        require(!currentSession.trialPlayerScores[sessionId].hasSubmitted, "Score already submitted");
        
        currentSession.trialPlayerScores[sessionId].score = score;
        currentSession.trialPlayerScores[sessionId].hasSubmitted = true;
        currentSession.trialPlayerScores[sessionId].submissionTime = block.timestamp;
        
        emit TrialScoreSubmitted(sessionId, score, block.timestamp);
    }
    
    /**
     * @dev Distribute prizes to winners (only owner, after session ends)
     * RESTRICTED: Only paid players are eligible for prize pool distributions
     * Trial players are excluded from prize distribution to prevent abuse
     */
    function distributePrizes() external onlyOwner onlySessionEnded nonReentrant {
        require(!currentSession.prizesDistributed, "Prizes already distributed");
        require(currentSession.prizePool > 0, "No prize pool");
        
        // Collect only paid player scores (trial players excluded from prize distribution)
        ScoreEntry[] memory paidPlayerScores = new ScoreEntry[](currentSession.paidPlayers.length);
        
        uint256 scoreIndex = 0;
        
        // Add only paid player scores
        for (uint256 i = 0; i < currentSession.paidPlayers.length; i++) {
            address player = currentSession.paidPlayers[i];
            if (currentSession.playerScores[player].hasSubmitted) {
                paidPlayerScores[scoreIndex] = ScoreEntry({
                    playerAddress: player,
                    score: currentSession.playerScores[player].score
                });
                scoreIndex++;
            }
        }
        
        // If no paid players submitted scores, return early
        if (scoreIndex == 0) {
            currentSession.prizesDistributed = true;
            currentSession.isActive = false;
            emit SessionEnded(block.timestamp);
            return;
        }
        
        // Sort by score (highest first)
        _sortScores(paidPlayerScores, scoreIndex);
        
        // Calculate prize distribution (only among paid players)
        uint256 totalPrizePool = currentSession.prizePool;
        uint256 firstPrize = (totalPrizePool * 50) / 100;  // 50%
        uint256 secondPrize = (totalPrizePool * 30) / 100; // 30%
        uint256 thirdPrize = (totalPrizePool * 15) / 100;  // 15%
        uint256 participationPrize = (totalPrizePool * 5) / 100; // 5%
        
        // Distribute prizes to paid players only
        address[] memory winners = new address[](scoreIndex);
        uint256[] memory amounts = new uint256[](scoreIndex);
        
        uint256 winnerIndex = 0;
        
        for (uint256 i = 0; i < scoreIndex && i < 10; i++) { // Top 10 get prizes
            uint256 prizeAmount = 0;
            
            if (i == 0) prizeAmount = firstPrize;
            else if (i == 1) prizeAmount = secondPrize;
            else if (i == 2) prizeAmount = thirdPrize;
            else prizeAmount = participationPrize / (scoreIndex - 3); // Split participation among remaining
            
            // All players in this array are paid players (trial players excluded)
            winners[winnerIndex] = paidPlayerScores[i].playerAddress;
            amounts[winnerIndex] = prizeAmount;
            winnerIndex++;
            
            if (prizeAmount > 0) {
                require(
                    usdcToken.transfer(paidPlayerScores[i].playerAddress, prizeAmount),
                    "Prize transfer failed"
                );
            }
        }
        
        currentSession.prizesDistributed = true;
        currentSession.isActive = false;
        
        emit PrizesDistributed(
            currentSession.startTime,
            winners,
            amounts
        );
        emit SessionEnded(block.timestamp);
    }
    
    /**
     * @dev Get current session info
     */
    function getSessionInfo() external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 prizePool,
        uint256 paidPlayerCount,
        uint256 trialPlayerCount,
        bool isActive,
        bool prizesDistributed
    ) {
        return (
            currentSession.startTime,
            currentSession.endTime,
            currentSession.prizePool,
            currentSession.paidPlayerCount,
            currentSession.trialPlayerCount,
            currentSession.isActive,
            currentSession.prizesDistributed
        );
    }
    
    /**
     * @dev Get player score
     */
    function getPlayerScore(address player) external view returns (
        uint256 score,
        bool hasSubmitted,
        uint256 submissionTime
    ) {
        PlayerScore memory playerScore = currentSession.playerScores[player];
        return (playerScore.score, playerScore.hasSubmitted, playerScore.submissionTime);
    }
    
    /**
     * @dev Get trial player score
     */
    function getTrialPlayerScore(string calldata sessionId) external view returns (
        uint256 score,
        bool hasSubmitted,
        uint256 submissionTime
    ) {
        TrialPlayerScore memory trialScore = currentSession.trialPlayerScores[sessionId];
        return (trialScore.score, trialScore.hasSubmitted, trialScore.submissionTime);
    }
    
    /**
     * @dev Update platform fee recipient address (only owner)
     * @param _newRecipient New platform fee recipient address
     */
    function updatePlatformFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient address");
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = _newRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, _newRecipient);
    }
    
    /**
     * @dev Emergency function to withdraw USDC (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        require(usdcToken.transfer(owner(), balance), "Withdrawal failed");
    }
    
    // Internal functions
    struct ScoreEntry {
        address playerAddress;
        uint256 score;
    }
    
    function _sortScores(ScoreEntry[] memory scores, uint256 length) internal pure {
        // Simple bubble sort for demo - in production use a more efficient algorithm
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (scores[j].score < scores[j + 1].score) {
                    ScoreEntry memory temp = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = temp;
                }
            }
        }
    }
}
