// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IChainlinkFunctions} from "./interfaces/IChainlinkFunctions.sol";

/// @title IReceiver - Interface for receiving Chainlink CRE workflow reports
/// @notice This interface is required for contracts that receive reports from Chainlink CRE workflows
interface IReceiver is IERC165 {
    /// @notice Handles incoming keystone reports from Chainlink CRE workflows
    /// @param metadata Report metadata containing workflow ID, name, and owner
    /// @param report Encoded function call data (e.g., encoded distributePrizes() call)
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract TriviaBattle is ReentrancyGuard, Ownable, IReceiver {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant MIN_SESSION_INTERVAL = 10 minutes; // Minimum time between sessions (game duration is ~5-10 minutes)
    uint256 public constant MAX_PLAYERS = 100;
    uint256 public constant MIN_PLAYERS = 1; // Allow single-player sessions for leaderboard competition
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10; // Platform fee percentage (automatically deducted and sent to owner)
    uint256 public constant CHAINLINK_FEE = 0.1 * 1e18; // 0.1 LINK

    // --- State Variables ---
    IERC20 public immutable USDC_TOKEN;
    IERC20 public immutable LINK_TOKEN;
    IChainlinkFunctions public chainlinkFunctions; // Non-immutable to allow setting after deployment
    address public chainlinkOracle;
    uint256 public sessionInterval;
    uint256 public entryFee;
    uint256 public lastSessionTime;
    uint256 public sessionCounter;
    uint256 public timeLockEnd;
    uint256 public timeLockDelay = 2 days; // Default 2 days, can be changed by owner
    bool public isSessionActive;

    // Player and prize tracking
    address[] public players;
    mapping(address => bool) public hasParticipated;
    mapping(address => uint256) public playerScores;
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public currentSessionPrizePool; // Track entry fees collected for current session

    // --- Structs ---
    struct PlayerScore {
        address player;
        uint256 score;
    }

    // --- Events ---
    event SessionStarted(uint256 indexed sessionId, uint256 startTime);
    event PlayerJoined(address indexed player, uint256 sessionId);
    event PrizesDistributed(
        uint256 indexed sessionId,
        address[] winners,
        uint256[] prizeAmounts
    );
    event PlatformFeeDistributed(
        uint256 indexed sessionId,
        address indexed recipient,
        uint256 amount
    );
    event EmergencyWithdrawalInitiated(
        address indexed initiator,
        uint256 amount,
        uint256 releaseTime
    );
    event WithdrawalExecuted(address indexed recipient, uint256 amount);
    event ChainlinkRequestSent(
        bytes32 indexed requestId,
        address indexed sender,
        string functionName
    );
    event ChainlinkResponseReceived(
        bytes32 indexed requestId,
        bytes response,
        bytes error
    );

    // --- Errors ---
    error TriviaBattle__SessionAlreadyActive();
    error TriviaBattle__SessionNotActive();
    error TriviaBattle__NotEnoughPlayers();
    error TriviaBattle__AlreadyParticipated();
    error TriviaBattle__InsufficientEntryFee();
    error TriviaBattle__InvalidSessionInterval();
    error TriviaBattle__SessionIntervalNotElapsed();
    error TriviaBattle__TimeLockActive(uint256 releaseTime);
    error TriviaBattle__Unauthorized();
    error TriviaBattle__ZeroAddress();
    error TriviaBattle__InsufficientUSDCBalance();
    error TriviaBattle__WithdrawalAmountTooLow();
    error TriviaBattle__NoPendingWithdrawal();

    // --- Modifier ---
    modifier onlyOwnerOrChainlink() {
        _onlyOwnerOrChainlink();
        _;
    }

    function _onlyOwnerOrChainlink() internal view {
        if (msg.sender != owner() && msg.sender != chainlinkOracle) {
            revert TriviaBattle__Unauthorized();
        }
    }

    // --- Constructor ---
    constructor(
        address _usdcAddress,
        address _linkAddress,
        address _chainlinkFunctionsAddress,
        address _chainlinkOracle,
        uint256 _sessionInterval,
        uint256 _entryFee
    ) Ownable(msg.sender) {
        // USDC and LINK addresses must be non-zero (required for contract operation)
        if (_usdcAddress == address(0) || _linkAddress == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        // Chainlink addresses can be zero during deployment and set later via setChainlinkOracle()
        // They will be validated when actually used (e.g., in sendChainlinkRequest)

        USDC_TOKEN = IERC20(_usdcAddress);
        LINK_TOKEN = IERC20(_linkAddress);
        // Chainlink addresses can be zero during deployment and set later via setter functions
        // They will be validated when actually used (e.g., in sendChainlinkRequest)
        if (_chainlinkFunctionsAddress != address(0)) {
            chainlinkFunctions = IChainlinkFunctions(_chainlinkFunctionsAddress);
        }
        chainlinkOracle = _chainlinkOracle;

        _setSessionInterval(_sessionInterval);
        _setEntryFee(_entryFee);
        lastSessionTime = block.timestamp;
        sessionCounter = 0; // Explicitly initialize session counter to 0
    }

    // --- Core Functions ---
    function startNewSession() external onlyOwner {
        if (isSessionActive) {
            revert TriviaBattle__SessionAlreadyActive();
        }
        if (block.timestamp < lastSessionTime + sessionInterval) {
            revert TriviaBattle__SessionIntervalNotElapsed();
        }

        // Increment session counter BEFORE activating session to ensure correct session ID
        sessionCounter++;
        isSessionActive = true;
        lastSessionTime = block.timestamp;
        currentSessionPrizePool = 0; // Reset prize pool for new session

        // Reset player tracking
        // Note: Cannot delete mappings, so we reset by clearing the players array
        // and individual entries will be overwritten when new players join
        for (uint256 i = 0; i < players.length; i++) {
            delete hasParticipated[players[i]];
            delete playerScores[players[i]];
        }
        players = new address[](0);

        emit SessionStarted(sessionCounter, block.timestamp); // Bug 2 Fix: Use sessionCounter for sessionId
    }

    function joinBattle() external nonReentrant {
        if (!isSessionActive) {
            revert TriviaBattle__SessionNotActive();
        }
        
        // Check if player participated in current session
        // If hasParticipated is true but player is not in current players array,
        // they're from a previous session, so clear the flag and allow them to join
        if (hasParticipated[msg.sender]) {
            // Check if player is in current session's players array
            bool inCurrentSession = false;
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] == msg.sender) {
                    inCurrentSession = true;
                    break;
                }
            }
            // If not in current session, clear stale flag from previous session
            if (!inCurrentSession) {
                delete hasParticipated[msg.sender];
            } else {
                revert TriviaBattle__AlreadyParticipated();
            }
        }

        // Check and transfer entry fee
        uint256 usdcBalance = USDC_TOKEN.balanceOf(msg.sender);
        if (usdcBalance < entryFee) {
            revert TriviaBattle__InsufficientEntryFee();
        }

        USDC_TOKEN.safeTransferFrom(msg.sender, address(this), entryFee);

        // Track entry fee in current session's prize pool
        currentSessionPrizePool += entryFee;

        // Register player
        hasParticipated[msg.sender] = true;
        players.push(msg.sender);
        playerScores[msg.sender] = 0;

        emit PlayerJoined(msg.sender, sessionCounter); // Bug 1 Fix: Use sessionCounter instead of block.timestamp
    }

    function submitScores(
        address[] calldata playerAddresses,
        uint256[] calldata scores
    ) external onlyOwnerOrChainlink nonReentrant {
        if (!isSessionActive) {
            revert TriviaBattle__SessionNotActive();
        }
        if (playerAddresses.length != scores.length) {
            revert("Player addresses and scores length mismatch");
        }
        if (playerAddresses.length == 0) {
            revert("No players provided");
        }

        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (!hasParticipated[playerAddresses[i]]) {
                revert("Player not registered in this session");
            }
            playerScores[playerAddresses[i]] = scores[i];
        }
    }

    function endSession() external onlyOwner nonReentrant {
        if (!isSessionActive) {
            revert TriviaBattle__SessionNotActive();
        }
        if (players.length < MIN_PLAYERS) {
            revert TriviaBattle__NotEnoughPlayers();
        }

        isSessionActive = false;

        // Calculate and distribute prizes
        _distributePrizes();
    }

    /**
     * @dev Distribute prizes (can be called by owner or Chainlink for automation)
     * This function allows Chainlink CRE to automatically distribute prizes weekly
     * SECURITY: Uses onlyOwnerOrChainlink modifier to allow automated distribution
     */
    function distributePrizes() external onlyOwnerOrChainlink nonReentrant {
        // Always check session interval to maintain timing guarantees
        // This prevents distribution before the required interval has elapsed,
        // even if the session was already ended via endSession()
        if (block.timestamp < lastSessionTime + sessionInterval) {
            revert TriviaBattle__SessionIntervalNotElapsed();
        }

        // Check if session has ended
        if (isSessionActive) {
            // Session expired, mark as inactive
            isSessionActive = false;
        }

        // Check minimum players requirement
        if (players.length < MIN_PLAYERS) {
            revert TriviaBattle__NotEnoughPlayers();
        }

        // Calculate and distribute prizes
        _distributePrizes();
    }

    // --- Prize Distribution (Refactored) ---
    function _distributePrizes() private {
        // Calculate prize pool from current session's entry fees, excluding pending withdrawals
        uint256 contractBalance = USDC_TOKEN.balanceOf(address(this));
        uint256 pendingWithdrawalAmount = pendingWithdrawals[owner()];
        
        // Prize pool is the minimum of:
        // 1. Current session's collected entry fees
        // 2. Contract balance minus pending withdrawals (to prevent distributing funds reserved for withdrawal)
        uint256 availableBalance = contractBalance > pendingWithdrawalAmount 
            ? contractBalance - pendingWithdrawalAmount 
            : 0;
        uint256 totalPrizePool = currentSessionPrizePool < availableBalance 
            ? currentSessionPrizePool 
            : availableBalance;
        
        require(totalPrizePool > 0, "No prize pool available");

        // Calculate and send platform fee to owner
        uint256 platformFee = (totalPrizePool * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 winnerPool = totalPrizePool - platformFee;
        
        // Automatically send platform fee to owner
        if (platformFee > 0) {
            USDC_TOKEN.safeTransfer(owner(), platformFee);
            emit PlatformFeeDistributed(sessionCounter, owner(), platformFee);
        }

        // Get top 3 players
        address[] memory topPlayers = _findTopPlayers(3);
        require(topPlayers.length > 0, "No winners found");

        // Calculate prize amounts from winner pool (90% of total after platform fee deduction)
        uint256[] memory prizeAmounts = _calculatePrizeAmounts(
            winnerPool,
            topPlayers.length
        );

        // Distribute prizes
        _transferPrizes(topPlayers, prizeAmounts);

        // Emit event
        emit PrizesDistributed(sessionCounter, topPlayers, prizeAmounts);

        // Reset player state after prize distribution
        // Reset all players' state before clearing the array
        for (uint256 i = 0; i < players.length; i++) {
            delete hasParticipated[players[i]];
            delete playerScores[players[i]];
        }
        players = new address[](0); // Reset players array
        currentSessionPrizePool = 0; // Reset prize pool after distribution
        isSessionActive = false; // Mark session as inactive after prize distribution
    }

    function _findTopPlayers(uint256 numWinners)
        private
        view
        returns (address[] memory)
    {
        // Create an array of PlayerScore
        PlayerScore[] memory playerScoresArray = new PlayerScore[](players.length);
        for (uint256 i = 0; i < players.length; i++) {
            playerScoresArray[i] = PlayerScore({
                player: players[i],
                score: playerScores[players[i]]
            });
        }

        // Bug 4 Fix: Handle empty or single-element arrays
        if (playerScoresArray.length <= 1) {
            address[] memory result = new address[](playerScoresArray.length);
            for (uint256 i = 0; i < playerScoresArray.length; i++) {
                result[i] = playerScoresArray[i].player;
            }
            return result;
        }

        // Simple bubble sort (for arrays with 2+ elements)
        for (uint256 i = 0; i < playerScoresArray.length - 1; i++) {
            for (uint256 j = 0; j < playerScoresArray.length - i - 1; j++) {
                if (
                    playerScoresArray[j].score <
                    playerScoresArray[j + 1].score
                ) {
                    PlayerScore memory temp = playerScoresArray[j];
                    playerScoresArray[j] = playerScoresArray[j + 1];
                    playerScoresArray[j + 1] = temp;
                }
            }
        }

        // Prepare result
        uint256 resultLength = numWinners < playerScoresArray.length
            ? numWinners
            : playerScoresArray.length;
        address[] memory topPlayers = new address[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            topPlayers[i] = playerScoresArray[i].player;
        }

        return topPlayers;
    }

    function _calculatePrizeAmounts(
        uint256 winnerPool,
        uint256 numWinners
    ) private pure returns (uint256[] memory) {
        uint256[] memory prizeAmounts = new uint256[](numWinners);

        // Distribute winner pool (90% of total prize pool) based on number of winners:
        // - 1 winner: 100% of winner pool (90% of total)
        // - 2 winners: 60% first, 40% second
        // - 3+ winners: 60% first, 30% second, 10% third
        // Any remainder from rounding errors is given to first place to ensure all funds are distributed
        if (numWinners == 1) {
            prizeAmounts[0] = winnerPool; // Single winner gets 100% of winner pool (90% of total)
        } else if (numWinners == 2) {
            prizeAmounts[0] = (winnerPool * 60) / 100; // First place: 60% of winner pool
            prizeAmounts[1] = (winnerPool * 40) / 100; // Second place: 40% of winner pool
            // Give any remainder to first place to avoid rounding errors
            prizeAmounts[0] += winnerPool - prizeAmounts[0] - prizeAmounts[1];
        } else if (numWinners >= 3) {
            prizeAmounts[0] = (winnerPool * 60) / 100; // First place: 60% of winner pool
            prizeAmounts[1] = (winnerPool * 30) / 100; // Second place: 30% of winner pool
            prizeAmounts[2] = (winnerPool * 10) / 100; // Third place: 10% of winner pool
            // Give any remainder to first place to avoid rounding errors
            prizeAmounts[0] += winnerPool - prizeAmounts[0] - prizeAmounts[1] - prizeAmounts[2];
            // Winners beyond 3rd place receive 0 (prizeAmounts[i] remains 0 for i >= 3)
        }

        return prizeAmounts;
    }

    function _transferPrizes(
        address[] memory winners,
        uint256[] memory amounts
    ) private {
        // Validate array lengths match
        if (winners.length != amounts.length) {
            revert("Winners and amounts arrays length mismatch");
        }
        
        for (uint256 i = 0; i < winners.length; i++) {
            // Validate winner address is not zero
            if (winners[i] == address(0)) {
                revert TriviaBattle__ZeroAddress();
            }
            if (amounts[i] > 0) {
                USDC_TOKEN.safeTransfer(winners[i], amounts[i]);
            }
        }
    }

    // --- Withdrawal Functions ---
    function initiateEmergencyWithdraw() external onlyOwner nonReentrant {
        if (timeLockEnd > block.timestamp) {
            revert TriviaBattle__TimeLockActive(timeLockEnd);
        }

        uint256 contractBalance = USDC_TOKEN.balanceOf(address(this));
        if (contractBalance == 0) {
            revert TriviaBattle__InsufficientUSDCBalance();
        }

        // Check if there's an existing pending withdrawal that hasn't been executed
        uint256 existingPending = pendingWithdrawals[owner()];
        if (existingPending > 0) {
            revert("Previous withdrawal pending. Execute or wait for timelock.");
        }

        timeLockEnd = block.timestamp + timeLockDelay;
        // Set (not accumulate) the withdrawal amount to prevent exceeding contract balance
        pendingWithdrawals[owner()] = contractBalance;

        emit EmergencyWithdrawalInitiated(
            msg.sender,
            contractBalance,
            timeLockEnd
        );
    }

    function executeWithdrawal() external onlyOwner nonReentrant {
        uint256 amount = pendingWithdrawals[owner()];
        if (amount == 0) {
            revert TriviaBattle__NoPendingWithdrawal();
        }
        if (block.timestamp < timeLockEnd) {
            revert TriviaBattle__TimeLockActive(timeLockEnd);
        }

        // Safety check: ensure we don't try to withdraw more than available
        uint256 contractBalance = USDC_TOKEN.balanceOf(address(this));
        if (amount > contractBalance) {
            revert TriviaBattle__InsufficientUSDCBalance();
        }

        USDC_TOKEN.safeTransfer(owner(), amount);
        pendingWithdrawals[owner()] = 0;
        timeLockEnd = 0;

        emit WithdrawalExecuted(owner(), amount);
    }

    // --- Chainlink Integration ---
    function sendChainlinkRequest(
        string memory functionToCall,
        bytes memory params
    ) external onlyOwner {
        // Validate all parameters BEFORE transferring LINK to minimize risk of fund loss
        if (LINK_TOKEN.balanceOf(address(this)) < CHAINLINK_FEE) {
            revert("Insufficient LINK balance");
        }
        if (chainlinkOracle == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        if (address(chainlinkFunctions) == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }

        // Transfer LINK before calling requestOracleData (required by Chainlink Functions)
        // Note: If requestOracleData reverts after this point, LINK is lost.
        // We validate parameters above to minimize this risk.
        LINK_TOKEN.safeTransfer(address(chainlinkFunctions), CHAINLINK_FEE);

        // Note: requestOracleData is marked payable in the interface, but Chainlink Functions
        // uses LINK tokens for payment, not native ETH. We send 0 ETH value here.
        bytes32 requestId = chainlinkFunctions.requestOracleData{value: 0}(
            chainlinkOracle,
            params,
            bytes32(0), // Empty jobId for direct calls
            bytes4(0), // Interface ID (0 for default)
            block.chainid,
            address(this),
            bytes32(0) // Empty callback selector (uses fallback)
        );

        emit ChainlinkRequestSent(requestId, msg.sender, functionToCall);
    }

    function fulfillOracleRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory error
    ) external onlyOwnerOrChainlink {
        emit ChainlinkResponseReceived(requestId, response, error);
    }

    // --- Admin Functions ---
    function setChainlinkOracle(address _newOracle) external onlyOwner {
        if (_newOracle == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        chainlinkOracle = _newOracle;
    }

    function setChainlinkFunctions(address _newFunctions) external onlyOwner {
        if (_newFunctions == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        chainlinkFunctions = IChainlinkFunctions(_newFunctions);
    }

    function _setSessionInterval(uint256 _newInterval) private {
        if (_newInterval < MIN_SESSION_INTERVAL) {
            revert TriviaBattle__InvalidSessionInterval();
        }
        sessionInterval = _newInterval;
    }

    function setSessionInterval(uint256 _newInterval)
        external
        onlyOwner
        nonReentrant
    {
        _setSessionInterval(_newInterval);
    }

    function _setEntryFee(uint256 _newFee) private {
        entryFee = _newFee;
    }

    function setEntryFee(uint256 _newFee) external onlyOwner nonReentrant {
        _setEntryFee(_newFee);
    }


    function setTimeLockDelay(uint256 _newDelay) external onlyOwner {
        require(_newDelay > 0, "Time lock delay must be greater than 0");
        timeLockDelay = _newDelay;
    }

    // --- View Functions ---
    function getCurrentPlayers() external view returns (address[] memory) {
        return players;
    }

    function getPlayerScore(address player) external view returns (uint256) {
        return playerScores[player];
    }

    function getPendingWithdrawal(address account)
        external
        view
        returns (uint256)
    {
        return pendingWithdrawals[account];
    }

    function getContractUsdcBalance() external view returns (uint256) {
        return USDC_TOKEN.balanceOf(address(this));
    }

    // --- Chainlink CRE Integration (IReceiver) ---
    
    /// @notice Receives reports from Chainlink CRE workflow
    /// @dev This function is called by the Chainlink KeystoneForwarder when a CRE workflow
    ///      writes data onchain. The report contains encoded function call data (e.g., distributePrizes()).
    ///      We verify the caller is the configured chainlinkOracle (forwarder), then execute the report.
    /// @param report Encoded function call data from the CRE workflow
    function onReport(
        bytes calldata /* metadata */,
        bytes calldata report
    ) external {
        // Security: Verify caller is the Chainlink forwarder (set via setChainlinkOracle)
        if (msg.sender != chainlinkOracle) {
            revert TriviaBattle__Unauthorized();
        }

        // Execute the report data as a function call
        // The report contains the encoded function call (e.g., distributePrizes())
        // Use a low-level call to execute it
        (bool success, bytes memory returnData) = address(this).call(report);
        
        if (!success) {
            // Decode error if possible, otherwise revert with generic message
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert("TriviaBattle__ReportExecutionFailed");
            }
        }
    }

    /// @notice ERC165 interface detection
    /// @dev Returns true for IReceiver and IERC165 interface IDs
    /// @param interfaceId The interface identifier to check
    /// @return true if the contract implements the interface
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return 
            interfaceId == type(IReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}