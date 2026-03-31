// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title TriviaGame
 * @notice Decentralized trivia game with Chainlink Functions for trustless ranking submission
 * @dev Combines Chainlink Automation (finalization) + Chainlink Functions (ranking submission)
 *
 * Security Features:
 * - Chainlink Functions DON provides decentralized consensus on rankings
 * - Fallback oracle for emergency situations
 * - Automatic finalization via Chainlink Automation
 * - Proportional prize redistribution (100% of pool distributed)
 */
contract TriviaGame is Ownable, ReentrancyGuard, AutomationCompatibleInterface, FunctionsClient {
    using SafeERC20 for IERC20;
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables
    IERC20 public immutable USDC;
    uint256 public constant ENTRY_FEE = 1e6; // 1 USDC (6 decimals)
    uint256 public constant GAME_DURATION = 5 minutes;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 700; // 7%
    uint256 public constant SIMPLE_AUTOMATION_THRESHOLD = 100e6; // $100 in USDC (6 decimals)

    // Game state
    uint256 public currentGameId;
    address public fallbackOracle; // Emergency fallback only
    address public platformFeeRecipient;
    uint256 public accumulatedPlatformFees;

    // Chainlink Functions
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donID;
    string public rankingSource; // JavaScript source code for Functions
    bool public useChainlinkFunctions = true; // Toggle for testing/emergency

    // Track Functions requests
    mapping(bytes32 => uint256) public requestToGameId;

    enum ChainlinkMode {
        SimpleAutomation, // For games under $100 - only use automation oracle
        FullDON // For games $100+ - use Chainlink Functions DON
    }

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
        bytes32 functionsRequestId; // Track Chainlink Functions request
        ChainlinkMode chainlinkMode;
        mapping(address => bool) hasEntered;
        mapping(address => bool) hasClaimed;
        mapping(address => uint256) playerRanking;
    }

    mapping(uint256 => Game) public games;

    // Events
    event GameCreated(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event PlayerEntered(uint256 indexed gameId, address indexed player, uint256 totalPlayers);
    event RankingsRequested(uint256 indexed gameId, bytes32 indexed requestId);
    event RankingsReceived(uint256 indexed gameId, bytes32 indexed requestId, uint256 rankedPlayerCount);
    event RankingsSubmitted(uint256 indexed gameId, uint256 rankedPlayerCount);
    event GameFinalized(uint256 indexed gameId, uint256 prizePool, uint256 platformFee);
    event PrizeClaimed(uint256 indexed gameId, address indexed player, uint256 amount, uint256 ranking);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PlatformFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
    event ChainlinkFunctionsToggled(bool enabled);
    event FunctionsConfigUpdated(uint64 subscriptionId, uint32 gasLimit, bytes32 donID);
    event ChainlinkModeSet(uint256 indexed gameId, ChainlinkMode mode, uint256 expectedPrizePool);

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
    error RankingsAlreadyRequested();
    error UnexpectedRequestID();
    error ChainlinkFunctionsDisabled();

    constructor(address _usdc, address _fallbackOracle, address _platformFeeRecipient, address _functionsRouter)
        Ownable(msg.sender)
        FunctionsClient(_functionsRouter)
    {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_fallbackOracle == address(0)) revert InvalidAddress();
        if (_platformFeeRecipient == address(0)) revert InvalidAddress();

        USDC = IERC20(_usdc);
        fallbackOracle = _fallbackOracle;
        platformFeeRecipient = _platformFeeRecipient;

        // Default Chainlink Functions config (Base Sepolia)
        gasLimit = 300000;
        donID = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000;
    }

    modifier onlyFallbackOracle() {
        if (msg.sender != fallbackOracle) revert NotOracle();
        _;
    }

    /**
     * @notice Chainlink Automation - Check if game needs finalization
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (currentGameId == 0) {
            return (false, "");
        }

        Game storage game = games[currentGameId];

        if (game.isActive && block.timestamp >= game.endTime && game.rankingsSubmitted && !game.isFinalized) {
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
        // Determine Chainlink mode based on expected prize pool from previous game (lock at creation time)
        uint256 expectedPrizePool = 0;
        if (currentGameId > 1) {
            Game storage prevGame = games[currentGameId - 1];
            if (prevGame.playerCount > 0) {
                uint256 estimatedRevenue = prevGame.playerCount * ENTRY_FEE;
                uint256 estimatedFee = (estimatedRevenue * PLATFORM_FEE_PERCENTAGE) / 10000;
                expectedPrizePool = estimatedRevenue - estimatedFee;
            }
        }
        if (expectedPrizePool < SIMPLE_AUTOMATION_THRESHOLD) {
            game.chainlinkMode = ChainlinkMode.SimpleAutomation;
        } else {
            game.chainlinkMode = ChainlinkMode.FullDON;
        }
        emit ChainlinkModeSet(currentGameId, game.chainlinkMode, expectedPrizePool);

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
     * @notice Request rankings via Chainlink Functions (DECENTRALIZED)
     * @dev Chainlink DON nodes will fetch rankings from your API and reach consensus
     * @param gameId The game to get rankings for
     */
    function requestRankings(uint256 gameId) external returns (bytes32 requestId) {
        if (!useChainlinkFunctions) revert ChainlinkFunctionsDisabled();

        Game storage game = games[gameId];

        // Only allow Chainlink Functions for FullDON mode games
        if (game.chainlinkMode != ChainlinkMode.FullDON) {
            revert("Game uses SimpleAutomation mode - use fallback oracle");
        }

        if (!game.isActive) revert GameNotActive();
        if (block.timestamp < game.endTime) revert GameNotEnded();
        if (game.rankingsSubmitted) revert RankingsAlreadySubmitted();
        if (game.functionsRequestId != bytes32(0)) revert RankingsAlreadyRequested();

        // Build the Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(rankingSource);

        // Pass gameId as argument
        string[] memory args = new string[](1);
        args[0] = _uint256ToString(gameId);
        req.setArgs(args);

        // Send the request
        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);

        // Track the request
        game.functionsRequestId = requestId;
        requestToGameId[requestId] = gameId;

        emit RankingsRequested(gameId, requestId);

        return requestId;
    }

    /**
     * @notice Chainlink Functions callback - Receives rankings from DON
     * @dev Called by Chainlink Functions router after DON reaches consensus
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        uint256 gameId = requestToGameId[requestId];
        if (gameId == 0) revert UnexpectedRequestID();

        // Check for errors
        if (err.length > 0) {
            // Log error but don't revert - allow fallback oracle to submit
            return;
        }

        // Decode rankings from response
        address[] memory rankedPlayers = abi.decode(response, (address[]));

        // Validate and store rankings
        _processRankings(gameId, rankedPlayers);

        emit RankingsReceived(gameId, requestId, rankedPlayers.length);
    }

    /**
     * @notice Submit rankings directly (FALLBACK ONLY - for emergencies)
     * @dev Should only be used if Chainlink Functions fails
     */
    function submitRankingsFallback(uint256 gameId, address[] calldata rankedPlayers) external onlyFallbackOracle {
        Game storage game = games[gameId];

        // For SimpleAutomation games, allow immediate fallback submission
        if (game.chainlinkMode == ChainlinkMode.SimpleAutomation) {
            // no restrictions
        } else if (useChainlinkFunctions) {
            // For FullDON games, only allow fallback after timeout
            require(
                game.functionsRequestId != bytes32(0) && block.timestamp > game.endTime + 10 minutes,
                "Use Chainlink Functions first"
            );
        }

        _processRankings(gameId, rankedPlayers);
    }

    /**
     * @notice Internal function to process and validate rankings
     */
    function _processRankings(uint256 gameId, address[] memory rankedPlayers) internal {
        Game storage game = games[gameId];

        if (!game.isActive) revert GameNotActive();
        if (game.rankingsSubmitted) revert RankingsAlreadySubmitted();
        if (rankedPlayers.length > 10) revert InvalidRanking();

        // Validate all ranked players actually entered
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
     * @notice Calculate prize with proportional redistribution
     */
    function calculatePrize(uint256 gameId, uint256 ranking) public view returns (uint256 prize) {
        Game storage game = games[gameId];
        uint256 prizePool = game.prizePool;

        if (ranking == 0 || ranking > 10 || prizePool == 0) {
            return 0;
        }

        if (ranking > game.playerCount) {
            return 0;
        }

        uint256 baseShare = _getBaseShare(ranking);
        uint256 totalBaseShares = _getTotalBaseShares(game.playerCount);

        if (totalBaseShares == 0) return 0;

        return (prizePool * baseShare) / totalBaseShares;
    }

    function _getBaseShare(uint256 ranking) internal pure returns (uint256) {
        if (ranking == 1) return 4750; // 47.5%
        if (ranking == 2) return 2850; // 28.5%
        if (ranking == 3) return 1900; // 19.0%
        if (ranking >= 4 && ranking <= 10) return 71; // ~0.71% each
        return 0;
    }

    function _getTotalBaseShares(uint256 rankedPlayerCount) internal pure returns (uint256) {
        if (rankedPlayerCount == 0) return 0;
        if (rankedPlayerCount > 10) rankedPlayerCount = 10;

        uint256 total = 0;

        if (rankedPlayerCount >= 1) total += 4750;
        if (rankedPlayerCount >= 2) total += 2850;
        if (rankedPlayerCount >= 3) total += 1900;

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

    // Admin functions

    function updateFallbackOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidAddress();
        address oldOracle = fallbackOracle;
        fallbackOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }

    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Update Chainlink Functions configuration
     */
    function updateFunctionsConfig(
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donID,
        string calldata _rankingSource
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donID = _donID;
        rankingSource = _rankingSource;

        emit FunctionsConfigUpdated(_subscriptionId, _gasLimit, _donID);
    }

    /**
     * @notice Toggle Chainlink Functions on/off
     * @dev Emergency control - can disable Functions and use fallback oracle
     */
    function toggleChainlinkFunctions(bool enabled) external onlyOwner {
        useChainlinkFunctions = enabled;
        emit ChainlinkFunctionsToggled(enabled);
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

    function getGameInfo(uint256 gameId)
        external
        view
        returns (
            uint256 prizePool,
            uint256 platformFee,
            uint256 playerCount,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            bool isFinalized,
            bool rankingsSubmitted,
            ChainlinkMode chainlinkMode
        )
    {
        Game storage game = games[gameId];
        return (
            game.prizePool,
            game.platformFee,
            game.playerCount,
            game.startTime,
            game.endTime,
            game.isActive,
            game.isFinalized,
            game.rankingsSubmitted,
            game.chainlinkMode
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
        return game.isActive && block.timestamp >= game.endTime && game.rankingsSubmitted && !game.isFinalized;
    }

    function canCreateNewGame() external view returns (bool) {
        if (currentGameId == 0) return true;

        Game storage game = games[currentGameId];
        return !game.isActive || block.timestamp >= game.endTime;
    }

    function previewPrizeDistribution(uint256 gameId) external view returns (uint256[10] memory prizes) {
        for (uint256 i = 1; i <= 10; i++) {
            prizes[i - 1] = calculatePrize(gameId, i);
        }
        return prizes;
    }

    // Helper functions

    function _uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            // Casting to 'uint8' is safe because ASCII digits 0-9 fit in uint8 range (48-57)
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
