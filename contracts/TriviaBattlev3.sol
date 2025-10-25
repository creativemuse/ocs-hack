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
 * 
 * Prize Distribution:
 * - 3% platform fee
 * - 97% goes to prize pool, distributed among winners
 * - Unclaimed portions (when <10 players) redistributed proportionally
 */
contract TriviaGame is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable USDC;
    uint256 public constant ENTRY_FEE = 1e6; // 1 USDC (6 decimals)
    uint256 public constant GAME_DURATION = 5 minutes; // 10 songs x 10 sec x 3 rounds
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 300; // 3% (in basis points: 300/10000)
    
    // Game state
    uint256 public currentGameId;
    address public gameOracle; // Address authorized to submit rankings
    address public platformFeeRecipient; // Address to receive platform fees
    uint256 public accumulatedPlatformFees; // Track total platform fees collected
    
    // Note: Prize distribution is handled via base shares in calculatePrize
    // Base shares: 1st=4750, 2nd=2850, 3rd=1900, 4th-10th=71 each (basis points)
    
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
    event RankingsSubmitted(uint256 indexed gameId, uint256 rankedPlayerCount);
    event GameFinalized(uint256 indexed gameId, uint256 prizePool, uint256 platformFee);
    event PrizeClaimed(uint256 indexed gameId, address indexed player, uint256 amount, uint256 ranking);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PlatformFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
    event PrizeWeightsUpdated(uint256 first, uint256 second, uint256 third);
    
    // Errors
    error GameNotActive();
    error GameAlreadyFinalized();
    error AlreadyEntered();
    error NotOracle();
    error InvalidRanking();
    error AlreadyClaimed();
    error NotRanked();
    error GameNotEnded();
    error RankingsAlreadySubmitted();
    error NoActiveGame();
    error GameAlreadyActive();
    error NoFeesToWithdraw();
    error InvalidAddress();
    error InvalidWeights();
    
    constructor(address _usdc, address _gameOracle, address _platformFeeRecipient) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_gameOracle == address(0)) revert InvalidAddress();
        if (_platformFeeRecipient == address(0)) revert InvalidAddress();
        
        USDC = IERC20(_usdc);
        gameOracle = _gameOracle;
        platformFeeRecipient = _platformFeeRecipient;
    }
    
    modifier onlyOracle() {
        if (msg.sender != gameOracle) revert NotOracle();
        _;
    }
    
    /**
     * @notice Chainlink Automation - Check if game needs finalization
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (currentGameId == 0) {
            return (false, "");
        }
        
        Game storage game = games[currentGameId];
        
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
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256 gameId = abi.decode(performData, (uint256));
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
     * @notice Create a new game ON-DEMAND
     */
    function createGame() external onlyOwner {
        if (currentGameId > 0) {
            Game storage prevGame = games[currentGameId];
            if (prevGame.isActive) {
                if (block.timestamp >= prevGame.endTime) {
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
        game.endTime = block.timestamp + GAME_DURATION;
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
        
        USDC.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);
        
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
     */
    function submitRankings(uint256 gameId, address[] calldata rankedPlayers) external onlyOracle {
        Game storage game = games[gameId];
        
        if (!game.isActive) revert GameNotActive();
        if (block.timestamp < game.endTime) revert GameNotEnded();
        if (game.rankingsSubmitted) revert RankingsAlreadySubmitted();
        if (rankedPlayers.length > 10) revert InvalidRanking();
        
        // Allow empty rankings if no one played
        if (rankedPlayers.length > 0) {
            for (uint256 i = 0; i < rankedPlayers.length; i++) {
                address player = rankedPlayers[i];
                if (!game.hasEntered[player]) revert InvalidRanking();
                if (game.playerRanking[player] != 0) revert RankingsAlreadySubmitted();
                game.playerRanking[player] = i + 1;
            }
        }
        
        game.rankingsSubmitted = true;
        
        emit RankingsSubmitted(gameId, rankedPlayers.length);
    }
    
    /**
     * @notice Manual finalization fallback
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
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedPlatformFees;
        if (amount == 0) revert NoFeesToWithdraw();
        
        accumulatedPlatformFees = 0;
        USDC.safeTransfer(platformFeeRecipient, amount);
        
        emit PlatformFeesWithdrawn(platformFeeRecipient, amount);
    }
    
    /**
     * @notice Update platform fee recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @notice Calculate prize amount for a given ranking with proportional redistribution
     * @param gameId The game ID
     * @param ranking Player's ranking (1-10)
     * @return prize The prize amount in USDC
     * 
     * @dev Prize calculation with proportional redistribution:
     * - Base shares: 1st=4750, 2nd=2850, 3rd=1900, 4th-10th=71 each (basis points out of 10,000)
     * - When all 10 positions filled: shares sum to 10,000 (100%)
     * - When fewer players: shares are scaled up proportionally to use entire prize pool
     * 
     * Examples:
     * - 10 players: Standard distribution (47.5%, 28.5%, 19%, 0.71% each for 4th-10th)
     * - 3 players: Scales to 50%, 30%, 20% (unclaimed 5% redistributed proportionally)
     * - 1 player: Winner takes 100%
     */
    function calculatePrize(uint256 gameId, uint256 ranking) public view returns (uint256 prize) {
        Game storage game = games[gameId];
        uint256 prizePool = game.prizePool;
        
        if (ranking == 0 || ranking > 10 || prizePool == 0) {
            return 0;
        }
        
        // Don't pay out to ranks that don't exist
        if (ranking > game.playerCount) {
            return 0;
        }
        
        // Get base share for this ranking (in basis points, out of 10,000)
        uint256 baseShare = _getBaseShare(ranking);
        
        // Calculate sum of base shares for actual ranked players
        uint256 totalBaseShares = _getTotalBaseShares(game.playerCount);
        
        if (totalBaseShares == 0) return 0;
        
        // Scale up to use full prize pool
        // Prize = (baseShare / totalBaseShares) × prizePool
        return (prizePool * baseShare) / totalBaseShares;
    }
    
    /**
     * @notice Get base share for a ranking position
     * @param ranking Position (1-10)
     * @return baseShare Share in basis points (out of 10,000)
     * 
     * Base shares when all 10 positions filled:
     * 1st: 4750 (47.5%)
     * 2nd: 2850 (28.5%)
     * 3rd: 1900 (19.0%)
     * 4th-10th: 71 each (~0.71% each, totaling 5%)
     * Total: 10,000 (100%)
     */
    function _getBaseShare(uint256 ranking) internal pure returns (uint256) {
        if (ranking == 1) return 4750; // 47.5%
        if (ranking == 2) return 2850; // 28.5%
        if (ranking == 3) return 1900; // 19.0%
        if (ranking >= 4 && ranking <= 10) return 71; // ~0.71% each (500/7 ≈ 71)
        return 0;
    }
    
    /**
     * @notice Calculate total base shares for given number of players
     * @param rankedPlayerCount Number of players who placed
     * @return total Sum of all base shares
     * 
     * This determines the denominator for prize calculation.
     * When fewer than 10 players, total will be less than 10,000,
     * causing each player's share to scale up proportionally.
     */
    function _getTotalBaseShares(uint256 rankedPlayerCount) internal pure returns (uint256) {
        if (rankedPlayerCount == 0) return 0;
        if (rankedPlayerCount > 10) rankedPlayerCount = 10;
        
        uint256 total = 0;
        
        // Add top 3 shares
        if (rankedPlayerCount >= 1) total += 4750;
        if (rankedPlayerCount >= 2) total += 2850;
        if (rankedPlayerCount >= 3) total += 1900;
        
        // Add 4th-10th shares (71 basis points each)
        if (rankedPlayerCount > 3) {
            uint256 lowerTierCount = rankedPlayerCount - 3;
            total += 71 * lowerTierCount;
        }
        
        return total;
    }
    
    /**
     * @notice Claim prize for a finalized game
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
     */
    function updateOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidAddress();
        address oldOracle = gameOracle;
        gameOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    /**
     * @notice Update prize distribution base shares
     * @dev This function is removed - base shares are now fixed in the contract
     *      To change distribution, deploy a new contract version
     *      Current fixed distribution:
     *      - 1st: 47.5% (when 10 players)
     *      - 2nd: 28.5% (when 10 players)
     *      - 3rd: 19% (when 10 players)
     *      - 4th-10th: 0.71% each (when 10 players)
     *      - Automatically scales proportionally when fewer players
     */
    // Function removed - distribution is now fixed via _getBaseShare()
    
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
    
    function getTimeRemaining() external view returns (uint256 secondsRemaining) {
        if (currentGameId == 0) return 0;
        
        Game storage game = games[currentGameId];
        if (!game.isActive || block.timestamp >= game.endTime) {
            return 0;
        }
        return game.endTime - block.timestamp;
    }
    
    function isGameReadyToFinalize(uint256 gameId) external view returns (bool) {
        if (gameId == 0 || gameId > currentGameId) return false;
        
        Game storage game = games[gameId];
        return game.isActive && 
               block.timestamp >= game.endTime && 
               game.rankingsSubmitted && 
               !game.isFinalized;
    }
    
    function canCreateNewGame() external view returns (bool) {
        if (currentGameId == 0) return true;
        
        Game storage game = games[currentGameId];
        return !game.isActive || block.timestamp >= game.endTime;
    }
    
    /**
     * @notice Preview prize distribution for a game
     * @param gameId Game ID to preview
     * @return prizes Array of prize amounts for ranks 1-10
     */
    function previewPrizeDistribution(uint256 gameId) external view returns (uint256[10] memory prizes) {
        for (uint256 i = 1; i <= 10; i++) {
            prizes[i-1] = calculatePrize(gameId, i);
        }
        return prizes;
    }
}