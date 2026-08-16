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

/// @title TriviaBattlev5
/// @notice Session-scoped trivia game. Each paid entry is locked to a specific sessionCounter.
/// @dev Drop-in ABI replacement for TriviaBattle.sol: keeps joinBattle, submitScores,
///      distributePrizes, sessionCounter, getPlayerScore, etc., but makes sessions independent
///      so a player who paid into session N can still submit a score for session N after
///      session N+1 has started.
contract TriviaBattlev5 is ReentrancyGuard, Ownable, IReceiver {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant MIN_SESSION_INTERVAL = 10 minutes;
    uint256 public constant MAX_PLAYERS = 100;
    uint256 public constant MIN_PLAYERS = 1;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10;
    uint256 public constant CHAINLINK_FEE = 0.1 * 1e18;

    // --- State Variables ---
    IERC20 public immutable USDC_TOKEN;
    IERC20 public immutable LINK_TOKEN;
    IChainlinkFunctions public chainlinkFunctions;
    address public chainlinkOracle;
    uint256 public sessionInterval;
    uint256 public entryFee;
    uint256 public lastSessionTime;
    uint256 public sessionCounter;
    uint256 public timeLockEnd;
    uint256 public timeLockDelay = 2 days;

    // Per-session state
    struct Session {
        bool isActive;
        bool distributed;
        uint256 startTime;
        uint256 endTime;
        uint256 entryFee;
        uint256 prizePool;
        address[] players;
        mapping(address => bool) hasParticipated;
        mapping(address => uint256) playerScores;
    }

    mapping(uint256 => Session) public sessions;

    // Legacy global withdrawal accounting
    mapping(address => uint256) public pendingWithdrawals;

    // --- Structs ---
    struct PlayerScore {
        address player;
        uint256 score;
    }

    // --- Events ---
    event SessionStarted(uint256 indexed sessionId, uint256 startTime, uint256 endTime);
    event PlayerJoined(address indexed player, uint256 indexed sessionId);
    event PlayerRejoined(address indexed player, uint256 indexed sessionId);
    event ScoresSubmitted(uint256 indexed sessionId, uint256 playerCount);
    event PrizesDistributed(uint256 indexed sessionId, address[] winners, uint256[] prizeAmounts);
    event PlatformFeeDistributed(uint256 indexed sessionId, address indexed recipient, uint256 amount);
    event EmergencyWithdrawalInitiated(address indexed initiator, uint256 amount, uint256 releaseTime);
    event WithdrawalExecuted(address indexed recipient, uint256 amount);
    event ChainlinkRequestSent(bytes32 indexed requestId, address indexed sender, string functionName);
    event ChainlinkResponseReceived(bytes32 indexed requestId, bytes response, bytes error);

    // --- Errors ---
    error TriviaBattle__SessionAlreadyActive();
    error TriviaBattle__SessionNotActive();
    error TriviaBattle__SessionNotFound();
    error TriviaBattle__SessionAlreadyDistributed();
    error TriviaBattle__SessionDeadlineNotElapsed();
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
    error TriviaBattle__MaxPlayersReached();
    error TriviaBattle__EntryAfterDeadline();
    error TriviaBattle__NoScoresSubmitted();

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
        if (_usdcAddress == address(0) || _linkAddress == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }

        USDC_TOKEN = IERC20(_usdcAddress);
        LINK_TOKEN = IERC20(_linkAddress);
        if (_chainlinkOracle == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        if (_chainlinkFunctionsAddress != address(0)) {
            chainlinkFunctions = IChainlinkFunctions(_chainlinkFunctionsAddress);
        }
        chainlinkOracle = _chainlinkOracle;

        _setSessionInterval(_sessionInterval);
        _setEntryFee(_entryFee);
        lastSessionTime = block.timestamp;
        sessionCounter = 0;
    }

    // --- Core Functions ---

    /// @notice Opens a new session: creates fresh per-session state and increments sessionCounter.
    function _openNewSession() private {
        sessionCounter++;
        Session storage session = sessions[sessionCounter];
        session.isActive = true;
        session.distributed = false;
        session.startTime = block.timestamp;
        session.endTime = block.timestamp + sessionInterval;
        session.entryFee = entryFee;
        session.prizePool = 0;

        lastSessionTime = block.timestamp;

        emit SessionStarted(sessionCounter, session.startTime, session.endTime);
    }

    /// @dev First session ever (sessionCounter == 0) may open immediately. Later sessions wait sessionInterval.
    function _requireSessionIntervalElapsedForRestart() private view {
        if (sessionCounter == 0) return;
        if (block.timestamp < lastSessionTime + sessionInterval) {
            revert TriviaBattle__SessionIntervalNotElapsed();
        }
    }

    /// @notice Owner-only session start (legacy name preserved for ABI compatibility).
    function startNewSession() external onlyOwner {
        Session storage live = sessions[sessionCounter];
        if (sessionCounter > 0 && live.isActive) {
            // If the interval has elapsed, finalize the live session so a new one can start.
            // Players can still submit scores for the finalized session and trigger distribution.
            if (block.timestamp >= live.endTime) {
                live.isActive = false;
            } else {
                revert TriviaBattle__SessionAlreadyActive();
            }
        }
        _requireSessionIntervalElapsedForRestart();
        _openNewSession();
    }

    /// @notice Paid entry. If no session is active, opens one. Entry is locked to the current sessionCounter.
    function joinBattle() external nonReentrant {
        Session storage live = sessions[sessionCounter];

        // Auto-start a session if none is active and enough time has passed
        if (sessionCounter == 0 || !live.isActive) {
            _requireSessionIntervalElapsedForRestart();
            _openNewSession();
        }

        live = sessions[sessionCounter];

        if (live.distributed) {
            revert TriviaBattle__SessionAlreadyDistributed();
        }
        if (block.timestamp >= live.endTime) {
            revert TriviaBattle__EntryAfterDeadline();
        }

        uint256 usdcBalance = USDC_TOKEN.balanceOf(msg.sender);
        if (usdcBalance < live.entryFee) {
            revert TriviaBattle__InsufficientEntryFee();
        }

        bool alreadyRegistered = live.hasParticipated[msg.sender];
        if (alreadyRegistered) {
            // Arcade re-entry: add to prize pool again, do not duplicate player list
            USDC_TOKEN.safeTransferFrom(msg.sender, address(this), live.entryFee);
            live.prizePool += live.entryFee;
            emit PlayerRejoined(msg.sender, sessionCounter);
            return;
        }

        if (live.players.length >= MAX_PLAYERS) {
            revert TriviaBattle__MaxPlayersReached();
        }

        USDC_TOKEN.safeTransferFrom(msg.sender, address(this), live.entryFee);
        live.hasParticipated[msg.sender] = true;
        live.players.push(msg.sender);
        live.prizePool += live.entryFee;

        emit PlayerJoined(msg.sender, sessionCounter);
    }

    /// @notice Submit scores for the live session (legacy ABI). Scores are attributed to sessionCounter.
    function submitScores(address[] calldata playerAddresses, uint256[] calldata scores)
        external
        onlyOwnerOrChainlink
        nonReentrant
    {
        _submitScoresForSession(sessionCounter, playerAddresses, scores);
    }

    /// @notice Submit scores for a specific session. Allows late score submission after rollover.
    function submitScoresForSession(uint256 sessionId, address[] calldata playerAddresses, uint256[] calldata scores)
        external
        onlyOwnerOrChainlink
        nonReentrant
    {
        _submitScoresForSession(sessionId, playerAddresses, scores);
    }

    function _submitScoresForSession(uint256 sessionId, address[] memory playerAddresses, uint256[] memory scores)
        internal
    {
        Session storage session = sessions[sessionId];
        if (sessionId == 0 || session.startTime == 0) {
            revert TriviaBattle__SessionNotFound();
        }
        if (session.distributed) {
            revert TriviaBattle__SessionAlreadyDistributed();
        }
        if (playerAddresses.length != scores.length) {
            revert("Player addresses and scores length mismatch");
        }
        if (playerAddresses.length == 0) {
            revert("No players provided");
        }

        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (!session.hasParticipated[playerAddresses[i]]) {
                revert("Player not registered in this session");
            }
            session.playerScores[playerAddresses[i]] = scores[i];
        }

        emit ScoresSubmitted(sessionId, playerAddresses.length);
    }

    /**
     * @dev Chainlink CRE helper: write scores then distribute in one onReport call.
     *      Backward-compatible overload for the current live session.
     */
    function syncAndDistribute(address[] calldata playerAddresses, uint256[] calldata scores)
        external
        onlyOwnerOrChainlink
        nonReentrant
    {
        syncAndDistributeForSession(sessionCounter, playerAddresses, scores);
    }

    function syncAndDistributeForSession(
        uint256 sessionId,
        address[] calldata playerAddresses,
        uint256[] calldata scores
    ) public onlyOwnerOrChainlink nonReentrant {
        Session storage session = sessions[sessionId];
        if (sessionId == 0 || session.startTime == 0) {
            revert TriviaBattle__SessionNotFound();
        }
        if (session.distributed) {
            revert TriviaBattle__SessionAlreadyDistributed();
        }
        if (block.timestamp < session.endTime) {
            revert TriviaBattle__SessionDeadlineNotElapsed();
        }

        _submitScoresForSession(sessionId, playerAddresses, scores);
        _distributePrizesForSession(sessionId);
    }

    /// @notice Owner-only session end (legacy name preserved for ABI compatibility).
    function endSession() external onlyOwner nonReentrant {
        _endSession();
    }

    /// @dev Internal helper for ending the current session. Shared by endSession() and onReport().
    function _endSession() internal {
        Session storage live = sessions[sessionCounter];
        if (!live.isActive) {
            revert TriviaBattle__SessionNotActive();
        }
        if (block.timestamp < live.endTime) {
            revert TriviaBattle__SessionDeadlineNotElapsed();
        }
        if (live.players.length < MIN_PLAYERS) {
            revert TriviaBattle__NotEnoughPlayers();
        }

        live.isActive = false;
    }

    /// @notice Distribute prizes for the current live session (legacy ABI).
    function distributePrizes() external onlyOwnerOrChainlink nonReentrant {
        _distributePrizesForSession(sessionCounter);
    }

    /// @notice Distribute prizes for a specific session after its deadline.
    function distributePrizes(uint256 sessionId) external onlyOwnerOrChainlink nonReentrant {
        _distributePrizesForSession(sessionId);
    }

    // --- Prize Distribution ---
    function _distributePrizesForSession(uint256 sessionId) private {
        Session storage session = sessions[sessionId];
        if (sessionId == 0 || session.startTime == 0) {
            revert TriviaBattle__SessionNotFound();
        }
        if (session.distributed) {
            revert TriviaBattle__SessionAlreadyDistributed();
        }
        if (block.timestamp < session.endTime) {
            revert TriviaBattle__SessionDeadlineNotElapsed();
        }
        if (session.players.length < MIN_PLAYERS) {
            revert TriviaBattle__NotEnoughPlayers();
        }

        // Require at least one player to have a non-zero score — prevents
        // distributing prizes based on join order when scores were never submitted.
        if (!hasAnyScoresForSession(sessionId)) {
            revert TriviaBattle__NoScoresSubmitted();
        }

        // Prize pool is the full amount collected in this session (entry fee = 1 USDC)
        uint256 totalPrizePool = session.prizePool;
        if (totalPrizePool == 0) {
            revert("No prize pool available");
        }

        uint256 platformFee = (totalPrizePool * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 winnerPool = totalPrizePool - platformFee;

        address[] memory topPlayers = _findTopPlayers(sessionId, 3);
        if (topPlayers.length == 0) {
            revert("No winners found");
        }

        uint256[] memory prizeAmounts = _calculatePrizeAmounts(winnerPool, topPlayers.length);

        uint256 totalAwarded = 0;
        for (uint256 i = 0; i < prizeAmounts.length; i++) {
            totalAwarded += prizeAmounts[i];
        }
        if (totalAwarded > winnerPool) {
            revert("Prize overflow");
        }

        // Effects: mark session state before any external calls (CEI pattern)
        session.distributed = true;
        session.isActive = false;

        // Interactions: external token transfers
        if (platformFee > 0) {
            USDC_TOKEN.safeTransfer(owner(), platformFee);
            emit PlatformFeeDistributed(sessionId, owner(), platformFee);
        }

        _transferPrizes(topPlayers, prizeAmounts);

        emit PrizesDistributed(sessionId, topPlayers, prizeAmounts);
    }

    function _findTopPlayers(uint256 sessionId, uint256 numWinners) private view returns (address[] memory) {
        Session storage session = sessions[sessionId];
        PlayerScore[] memory playerScoresArray = new PlayerScore[](session.players.length);
        for (uint256 i = 0; i < session.players.length; i++) {
            playerScoresArray[i] =
                PlayerScore({player: session.players[i], score: session.playerScores[session.players[i]]});
        }

        if (playerScoresArray.length <= 1) {
            address[] memory result = new address[](playerScoresArray.length);
            for (uint256 i = 0; i < playerScoresArray.length; i++) {
                result[i] = playerScoresArray[i].player;
            }
            return result;
        }

        for (uint256 i = 0; i < playerScoresArray.length - 1; i++) {
            for (uint256 j = 0; j < playerScoresArray.length - i - 1; j++) {
                if (playerScoresArray[j].score < playerScoresArray[j + 1].score) {
                    PlayerScore memory temp = playerScoresArray[j];
                    playerScoresArray[j] = playerScoresArray[j + 1];
                    playerScoresArray[j + 1] = temp;
                }
            }
        }

        uint256 resultLength = numWinners < playerScoresArray.length ? numWinners : playerScoresArray.length;
        address[] memory topPlayers = new address[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            topPlayers[i] = playerScoresArray[i].player;
        }

        return topPlayers;
    }

    function _calculatePrizeAmounts(uint256 winnerPool, uint256 numWinners) private pure returns (uint256[] memory) {
        uint256[] memory prizeAmounts = new uint256[](numWinners);

        if (numWinners == 1) {
            prizeAmounts[0] = winnerPool;
        } else if (numWinners == 2) {
            prizeAmounts[0] = (winnerPool * 60) / 100;
            prizeAmounts[1] = (winnerPool * 40) / 100;
            prizeAmounts[0] += winnerPool - prizeAmounts[0] - prizeAmounts[1];
        } else if (numWinners >= 3) {
            prizeAmounts[0] = (winnerPool * 60) / 100;
            prizeAmounts[1] = (winnerPool * 30) / 100;
            prizeAmounts[2] = (winnerPool * 10) / 100;
            prizeAmounts[0] += winnerPool - prizeAmounts[0] - prizeAmounts[1] - prizeAmounts[2];
        }

        return prizeAmounts;
    }

    function _transferPrizes(address[] memory winners, uint256[] memory amounts) private {
        if (winners.length != amounts.length) {
            revert("Winners and amounts arrays length mismatch");
        }

        for (uint256 i = 0; i < winners.length; i++) {
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

        uint256 existingPending = pendingWithdrawals[owner()];
        if (existingPending > 0) {
            revert("Previous withdrawal pending. Execute or wait for timelock.");
        }

        timeLockEnd = block.timestamp + timeLockDelay;
        pendingWithdrawals[owner()] = contractBalance;

        emit EmergencyWithdrawalInitiated(msg.sender, contractBalance, timeLockEnd);
    }

    function executeWithdrawal() external onlyOwner nonReentrant {
        uint256 amount = pendingWithdrawals[owner()];
        if (amount == 0) {
            revert TriviaBattle__NoPendingWithdrawal();
        }
        if (block.timestamp < timeLockEnd) {
            revert TriviaBattle__TimeLockActive(timeLockEnd);
        }

        // Withdraw the minimum of the pending amount and the actual contract balance.
        // This prevents a permanent lock if the contract balance decreased during the
        // timelock (e.g., prizes were distributed by the CRE workflow).
        uint256 contractBalance = USDC_TOKEN.balanceOf(address(this));
        uint256 withdrawAmount = amount > contractBalance ? contractBalance : amount;
        if (withdrawAmount == 0) {
            revert TriviaBattle__InsufficientUSDCBalance();
        }

        // Effects
        pendingWithdrawals[owner()] = 0;
        timeLockEnd = 0;

        // Interactions
        USDC_TOKEN.safeTransfer(owner(), withdrawAmount);

        emit WithdrawalExecuted(owner(), withdrawAmount);
    }

    // --- Chainlink Integration ---
    function sendChainlinkRequest(string memory functionToCall, bytes memory params) external onlyOwner {
        if (LINK_TOKEN.balanceOf(address(this)) < CHAINLINK_FEE) {
            revert("Insufficient LINK balance");
        }
        if (chainlinkOracle == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }
        if (address(chainlinkFunctions) == address(0)) {
            revert TriviaBattle__ZeroAddress();
        }

        LINK_TOKEN.safeTransfer(address(chainlinkFunctions), CHAINLINK_FEE);

        bytes32 requestId = chainlinkFunctions.requestOracleData{value: 0}(
            chainlinkOracle, params, bytes32(0), bytes4(0), block.chainid, address(this), bytes32(0)
        );

        emit ChainlinkRequestSent(requestId, msg.sender, functionToCall);
    }

    function fulfillOracleRequest(bytes32 requestId, bytes memory response, bytes memory error)
        external
        onlyOwnerOrChainlink
    {
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

    function setSessionInterval(uint256 _newInterval) external onlyOwner nonReentrant {
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
        return sessions[sessionCounter].players;
    }

    function getCurrentPlayersForSession(uint256 sessionId) external view returns (address[] memory) {
        return sessions[sessionId].players;
    }

    function getPlayerScore(address player) external view returns (uint256) {
        return sessions[sessionCounter].playerScores[player];
    }

    function getPlayerScoreForSession(uint256 sessionId, address player) external view returns (uint256) {
        return sessions[sessionId].playerScores[player];
    }

    /// @notice Check if any player in a session has a non-zero score (single RPC call).
    /// @dev Replaces up to MAX_PLAYERS sequential getPlayerScoreForSession calls in the CRE workflow.
    function hasAnyScoresForSession(uint256 sessionId) public view returns (bool) {
        Session storage session = sessions[sessionId];
        for (uint256 i = 0; i < session.players.length; i++) {
            if (session.playerScores[session.players[i]] > 0) {
                return true;
            }
        }
        return false;
    }

    function getPendingWithdrawal(address account) external view returns (uint256) {
        return pendingWithdrawals[account];
    }

    function getContractUsdcBalance() external view returns (uint256) {
        return USDC_TOKEN.balanceOf(address(this));
    }

    function getSessionInfo(uint256 sessionId)
        external
        view
        returns (
            bool isActive,
            bool distributed,
            uint256 startTime,
            uint256 endTime,
            uint256 prizePool,
            uint256 playerCount
        )
    {
        Session storage session = sessions[sessionId];
        return (
            session.isActive,
            session.distributed,
            session.startTime,
            session.endTime,
            session.prizePool,
            session.players.length
        );
    }

    function isSessionActive() external view returns (bool) {
        return sessions[sessionCounter].isActive;
    }

    function canCreateNewSession() external view returns (bool) {
        if (sessionCounter == 0) return true;
        Session storage live = sessions[sessionCounter];
        return !live.isActive || block.timestamp >= live.endTime;
    }

    // --- Chainlink CRE Integration ---

    /// @dev Allowed function selectors that onReport may invoke.
    bytes4 private constant SEL_SYNC_AND_DISTRIBUTE =
        bytes4(keccak256("syncAndDistributeForSession(uint256,address[],uint256[])"));
    bytes4 private constant SEL_DISTRIBUTE_PRIZES = bytes4(keccak256("distributePrizes(uint256)"));
    bytes4 private constant SEL_SUBMIT_SCORES =
        bytes4(keccak256("submitScoresForSession(uint256,address[],uint256[])"));
    bytes4 private constant SEL_END_SESSION = bytes4(keccak256("endSession()"));

    function onReport(bytes calldata, bytes calldata report) external nonReentrant {
        if (msg.sender != chainlinkOracle) {
            revert TriviaBattle__Unauthorized();
        }

        // Restrict to whitelisted function selectors — prevents the oracle from
        // calling arbitrary privileged functions (setEntryFee, setChainlinkOracle, etc.).
        bytes4 selector = bytes4(report);
        bool allowed = selector == SEL_SYNC_AND_DISTRIBUTE || selector == SEL_DISTRIBUTE_PRIZES
            || selector == SEL_SUBMIT_SCORES || selector == SEL_END_SESSION;
        if (!allowed) {
            revert TriviaBattle__Unauthorized();
        }

        // Dispatch internally — avoids address(this).call() which would need
        // address(this) in the access control modifier (a security risk).
        if (selector == SEL_SYNC_AND_DISTRIBUTE) {
            (uint256 sid, address[] memory players, uint256[] memory scores) =
                abi.decode(report[4:], (uint256, address[], uint256[]));
            _submitScoresForSession(sid, players, scores);
            _distributePrizesForSession(sid);
            return;
        }
        if (selector == SEL_DISTRIBUTE_PRIZES) {
            (uint256 sid) = abi.decode(report[4:], (uint256));
            _distributePrizesForSession(sid);
            return;
        }
        if (selector == SEL_SUBMIT_SCORES) {
            (uint256 sid, address[] memory players, uint256[] memory scores) =
                abi.decode(report[4:], (uint256, address[], uint256[]));
            _submitScoresForSession(sid, players, scores);
            return;
        }
        if (selector == SEL_END_SESSION) {
            _endSession();
            return;
        }
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
