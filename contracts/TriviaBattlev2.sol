// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title TriviaGame
 * @notice On-demand trivia game with Chainlink Automation Custom Logic
 * @dev 5-minute games that start on-demand and auto-finalize when complete
 */
contract TriviaGame is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable USDC;
    uint256 public constant ENTRY_FEE = 1e6; // 1 USDC (6 decimals)
    uint256 public constant GAME_DURATION = 5 minutes; // 10 songs x 10 sec x 3 rounds
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 300; // 3% (in basis points: 300/10000)
    uint256 public constant TOP_PRIZE_PERCENTAGE = 9215; // 95% of 97% (after platform fee)
    uint256 public constant REMAINING_PERCENTAGE = 485; // 5% of 97% (after platform fee)
    
    // Game state
    uint256 public currentGameId;
    address public gameOracle; // Address authorized to submit rankings
    address public platformFeeRecipient; // Address to receive platform fees
    uint256 public accumulatedPlatformFees; // Track total platform fees collected
    
    // Prize distribution for top 3 (out of 95%)
    uint256 public firstPlacePct = 50; // 50% of 95% = 47.5% of total
    uint256 public secondPlacePct = 30; // 30% of 95% = 28.5% of total
    uint256 public thirdPlacePct = 20;  // 20% of 95% = 19% of total
    
    struct Game {
        uint256 gameId;
        uint256 prizePool;
        uint256 platformFee;
        uint256 playerCount;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        bool rankingsSubmitted;
        mapping(address => bool) hasEntered;
        mapping(address => bool) hasClaimed;
        mapping(address => uint256) playerRanking; // 0 = not ranked, 1-10 = ranking
    }
    
    mapping(uint256 => Game) public games;
    
    // Events
    event GameCreated(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event PlayerEntered(uint256 indexed gameId, address indexed player, uint256 totalPlayers);
    event RankingsSubmitted(uint256 indexed gameId);
    event GameFinalized(uint256 indexed gameId, uint256 prizePool, uint256 platformFee);
    event PrizeClaimed(uint256 indexed gameId, address indexed player, uint256 amount, uint256 ranking);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PlatformFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
    
    // Errors
    error GameNotActive();
    error GameAlreadyFinalized();
    error AlreadyEntered();
    error NotOracle();
    error InvalidRanking();
    error AlreadyClaimed();
    error NotRanked();
    error GameNotEnded();
    error RankingsNotSubmitted();
    error RankingsAlreadySubmitted();
    error NoActiveGame();
    error GameAlreadyActive();
    
    constructor(address _usdc, address _gameOracle, address _platformFeeRecipient) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_gameOracle != address(0), "Invalid oracle address");
        require(_platformFeeRecipient != address(0), "Invalid fee recipient address");
        USDC = IERC20(_usdc);
        gameOracle = _gameOracle;
        platformFeeRecipient = _platformFeeRecipient;
    }
    
    modifier onlyOracle() {
        _onlyOracle();
        _;
    }
    
    function _onlyOracle() internal view {
        if (msg.sender != gameOracle) revert NotOracle();
    }
    
    /**
     * @notice Chainlink Automation - Check if game needs finalization
     * @dev Called offchain by Chainlink to determine if upkeep is needed
     * @return upkeepNeeded True if a game is ready to finalize
     * @return performData Encoded gameId to finalize
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Only check current game (most recent)
        if (currentGameId == 0) {
            return (false, "");
        }
        
        Game storage game = games[currentGameId];
        
        // Game is ready to finalize if:
        // 1. Game is active
        // 2. Game end time has passed
        // 3. Rankings have been submitted
        // 4. Not already finalized
        if (game.isActive && 
            block.timestamp >= game.endTime && 
            game.rankingsSubmitted && 
            !game.isFinalized) {
            
            upkeepNeeded = true;
            performData = abi.encode(currentGameId);
        }
        
        return (upkeepNeeded, performData);
    }
    
    /**
     * @notice Chainlink Automation - Finalize game automatically
     * @dev Called onchain by Chainlink when checkUpkeep returns true
     * @param performData Encoded gameId from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256 gameId = abi.decode(performData, (uint256));
        Game storage game = games[gameId];
        
        // Re-validate all conditions (critical for security)
        require(game.isActive, "Game not active");
        require(block.timestamp >= game.endTime, "Game not ended");
        require(game.rankingsSubmitted, "Rankings not submitted");
        require(!game.isFinalized, "Already finalized");
        
        // Finalize the game
        game.isActive = false;
        game.isFinalized = true;
        
        emit GameFinalized(gameId, game.prizePool, game.platformFee);
    }
    
    /**
     * @notice Create a new game ON-DEMAND
     * @dev Can be called by owner anytime to start a new game
     */
    function createGame() external onlyOwner {
        // Ensure no active game is running
        if (currentGameId > 0) {
            Game storage prevGame = games[currentGameId];
            if (prevGame.isActive) {
                // Check if previous game ended but not finalized yet
                if (block.timestamp >= prevGame.endTime) {
                    // Auto-finalize if time passed
                    prevGame.isActive = false;
                    prevGame.isFinalized = true;
                    emit GameFinalized(currentGameId, prevGame.prizePool, prevGame.platformFee);
                } else {
                    revert GameAlreadyActive();
                }
            }
        }
        
        currentGameId++;
        Game storage game = games[currentGameId];
        game.gameId = currentGameId;
        game.startTime = block.timestamp;
        game.endTime = block.timestamp + GAME_DURATION; // Exactly 5 minutes from now
        game.isActive = true;
        
        emit GameCreated(currentGameId, game.startTime, game.endTime);
    }
    
    /**
     * @notice Enter the current game by paying entry fee
     */
    function enterGame() external nonReentrant {
        if (currentGameId == 0) revert NoActiveGame();
        Game storage game = games[currentGameId];
        
        if (!game.isActive) revert GameNotActive();
        if (game.hasEntered[msg.sender]) revert AlreadyEntered();
        if (block.timestamp >= game.endTime) revert GameNotActive();
        
        // Transfer USDC from player to contract
        USDC.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);
        
        // Calculate platform fee (3% of entry fee)
        uint256 platformFee = (ENTRY_FEE * PLATFORM_FEE_PERCENTAGE) / 10000;
        uint256 prizePoolContribution = ENTRY_FEE - platformFee;
        
        game.hasEntered[msg.sender] = true;
        game.playerCount++;
        game.prizePool += prizePoolContribution;
        game.platformFee += platformFee;
        accumulatedPlatformFees += platformFee;
        
        emit PlayerEntered(currentGameId, msg.sender, game.playerCount);
    }
    
    /**
     * @notice Submit rankings after game ends (called by oracle/backend)
     * @dev This triggers Chainlink Automation to finalize the game
     * @param gameId The game to submit rankings for
     * @param rankedPlayers Array of player addresses in order (1st to 10th place)
     */
    function submitRankings(uint256 gameId, address[] calldata rankedPlayers) external onlyOracle {
        Game storage game = games[gameId];
        
        if (!game.isActive) revert GameNotActive();
        if (block.timestamp < game.endTime) revert GameNotEnded();
        if (game.rankingsSubmitted) revert RankingsAlreadySubmitted();
        if (rankedPlayers.length > 10) revert InvalidRanking();
        
        // Allow empty rankings if no one played
        if (rankedPlayers.length > 0) {
            // Validate all ranked players actually entered
            for (uint256 i = 0; i < rankedPlayers.length; i++) {
                address player = rankedPlayers[i];
                if (!game.hasEntered[player]) revert InvalidRanking();
                if (game.playerRanking[player] != 0) revert RankingsAlreadySubmitted();
                game.playerRanking[player] = i + 1; // 1-indexed ranking
            }
        }
        
        game.rankingsSubmitted = true;
        
        emit RankingsSubmitted(gameId);
        
        // Note: Chainlink Automation will detect rankingsSubmitted = true
        // and automatically call performUpkeep to finalize the game
    }
    
    /**
     * @notice Manual finalization fallback (if Automation fails)
     * @param gameId The game to finalize
     */
    function manuallyFinalizeGame(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        
        require(game.isActive, "Game not active");
        require(block.timestamp >= game.endTime, "Game not ended");
        require(game.rankingsSubmitted, "Rankings not submitted");
        require(!game.isFinalized, "Already finalized");
        
        game.isActive = false;
        game.isFinalized = true;
        
        emit GameFinalized(gameId, game.prizePool, game.platformFee);
    }
    
    /**
     * @notice Withdraw accumulated platform fees
     * @dev Only owner can withdraw to the designated platform fee recipient
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedPlatformFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedPlatformFees = 0;
        USDC.safeTransfer(platformFeeRecipient, amount);
        
        emit PlatformFeesWithdrawn(platformFeeRecipient, amount);
    }
    
    /**
     * @notice Update platform fee recipient address
     * @param newRecipient New recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @notice Calculate prize amount for a given ranking
     * @param gameId The game ID
     * @param ranking Player's ranking (1-10)
     */
    function calculatePrize(uint256 gameId, uint256 ranking) public view returns (uint256) {
        Game storage game = games[gameId];
        uint256 prizePool = game.prizePool;
        
        if (ranking == 0 || ranking > 10 || prizePool == 0) return 0;
        
        if (ranking == 1) {
            // First place: 50% of 95%
            return (prizePool * TOP_PRIZE_PERCENTAGE * firstPlacePct) / 10000;
        } else if (ranking == 2) {
            // Second place: 30% of 95%
            return (prizePool * TOP_PRIZE_PERCENTAGE * secondPlacePct) / 10000;
        } else if (ranking == 3) {
            // Third place: 20% of 95%
            return (prizePool * TOP_PRIZE_PERCENTAGE * thirdPlacePct) / 10000;
        } else {
            // 4th-10th place: Split 5% equally
            uint256 remainingPool = (prizePool * REMAINING_PERCENTAGE) / 100;
            
            // Count how many players ranked 4th-10th
            uint256 shareCount = 0;
            for (uint256 i = 4; i <= 10; i++) {
                if (game.playerCount >= i) {
                    shareCount++;
                }
            }
            
            if (shareCount == 0) return 0;
            return remainingPool / shareCount;
        }
    }
    
    /**
     * @notice Claim prize for a finalized game
     * @param gameId The game to claim from
     */
    function claimPrize(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        
        if (!game.isFinalized) revert GameNotActive();
        if (game.hasClaimed[msg.sender]) revert AlreadyClaimed();
        
        uint256 ranking = game.playerRanking[msg.sender];
        if (ranking == 0) revert NotRanked();
        
        uint256 prize = calculatePrize(gameId, ranking);
        if (prize == 0) return;
        
        game.hasClaimed[msg.sender] = true;
        USDC.safeTransfer(msg.sender, prize);
        
        emit PrizeClaimed(gameId, msg.sender, prize, ranking);
    }
    
    /**
     * @notice Update the game oracle address
     * @param newOracle New oracle address
     */
    function updateOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        address oldOracle = gameOracle;
        gameOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    /**
     * @notice Update prize distribution percentages for top 3
     */
    function updatePrizeDistribution(uint256 _first, uint256 _second, uint256 _third) external onlyOwner {
        require(_first + _second + _third == 100, "Must total 100%");
        firstPlacePct = _first;
        secondPlacePct = _second;
        thirdPlacePct = _third;
    }
    
    // View functions
    function hasPlayerEntered(uint256 gameId, address player) external view returns (bool) {
        return games[gameId].hasEntered[player];
    }
    
    function getPlayerRanking(uint256 gameId, address player) external view returns (uint256) {
        return games[gameId].playerRanking[player];
    }
    
    function hasPlayerClaimed(uint256 gameId, address player) external view returns (bool) {
        return games[gameId].hasClaimed[player];
    }
    
    function getGameInfo(uint256 gameId) external view returns (
        uint256 prizePool,
        uint256 platformFee,
        uint256 playerCount,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        bool isFinalized,
        bool rankingsSubmitted
    ) {
        Game storage game = games[gameId];
        return (
            game.prizePool,
            game.platformFee,
            game.playerCount, 
            game.startTime,
            game.endTime,
            game.isActive, 
            game.isFinalized,
            game.rankingsSubmitted
        );
    }
    
    /**
     * @notice Get time remaining in current game
     * @return secondsRemaining Time left in seconds (0 if game ended)
     */
    function getTimeRemaining() external view returns (uint256 secondsRemaining) {
        if (currentGameId == 0) return 0;
        
        Game storage game = games[currentGameId];
        if (!game.isActive || block.timestamp >= game.endTime) {
            return 0;
        }
        return game.endTime - block.timestamp;
    }
    
    /**
     * @notice Check if a game is ready to be finalized
     * @dev Useful for monitoring/debugging
     */
    function isGameReadyToFinalize(uint256 gameId) external view returns (bool) {
        if (gameId == 0 || gameId > currentGameId) return false;
        
        Game storage game = games[gameId];
        return game.isActive && 
               block.timestamp >= game.endTime && 
               game.rankingsSubmitted && 
               !game.isFinalized;
    }
    
    /**
     * @notice Check if a new game can be created
     * @dev Returns true if no game is active or current game has ended
     */
    function canCreateNewGame() external view returns (bool) {
        if (currentGameId == 0) return true;
        
        Game storage game = games[currentGameId];
        return !game.isActive || block.timestamp >= game.endTime;
    }
}