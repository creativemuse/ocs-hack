// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {TriviaBattlev5} from "../contracts/TriviaBattlev5.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 1e6);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract TriviaBattlev5Test is Test {
    TriviaBattlev5 public game;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public oracle = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public player3 = address(0x5);
    address public player4 = address(0x6);
    address public linkToken = address(0x777);

    uint256 constant ENTRY_FEE = 1e6;
    uint256 constant SESSION_INTERVAL = 7 days;

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();

        vm.prank(owner);
        game = new TriviaBattlev5(
            address(usdc),
            linkToken,
            address(0), // chainlink functions not used in unit tests
            oracle,
            SESSION_INTERVAL,
            ENTRY_FEE
        );

        usdc.mint(player1, 1000 * 1e6);
        usdc.mint(player2, 1000 * 1e6);
        usdc.mint(player3, 1000 * 1e6);
        usdc.mint(player4, 1000 * 1e6);
    }

    // ============ Deployment ============

    function test_InitialState() public view {
        assertEq(game.sessionCounter(), 0);
        assertEq(game.entryFee(), ENTRY_FEE);
        assertEq(game.sessionInterval(), SESSION_INTERVAL);
        assertEq(game.owner(), owner);
        assertEq(game.chainlinkOracle(), oracle);
    }

    // ============ Session Lifecycle ============

    function test_StartNewSession() public {
        vm.prank(owner);
        game.startNewSession();

        assertEq(game.sessionCounter(), 1);

        (bool isActive, bool distributed, uint256 startTime, uint256 endTime, uint256 prizePool, uint256 playerCount) =
            game.getSessionInfo(1);
        assertTrue(isActive);
        assertFalse(distributed);
        assertEq(startTime, block.timestamp);
        assertEq(endTime, block.timestamp + SESSION_INTERVAL);
        assertEq(prizePool, 0);
        assertEq(playerCount, 0);
    }

    function test_JoinBattleAutoStartsSession() public {
        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        assertEq(game.sessionCounter(), 1);

        (,,,, uint256 prizePool, uint256 playerCount) = game.getSessionInfo(1);
        assertEq(playerCount, 1);
        assertEq(prizePool, ENTRY_FEE);
    }

    function test_JoinBattleLocksToSession() public {
        vm.prank(owner);
        game.startNewSession();

        uint256 sessionId = game.sessionCounter();
        assertEq(sessionId, 1);

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        (,,,, uint256 prizePool, uint256 playerCount) = game.getSessionInfo(sessionId);
        assertEq(playerCount, 1);
        assertEq(prizePool, ENTRY_FEE);
    }

    function test_CannotJoinAfterDeadline() public {
        vm.prank(owner);
        game.startNewSession();

        vm.warp(block.timestamp + SESSION_INTERVAL + 1);

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        vm.expectRevert(TriviaBattlev5.TriviaBattle__EntryAfterDeadline.selector);
        game.joinBattle();
        vm.stopPrank();
    }

    function test_ReEntryAddsToPrizePoolWithoutDuplicatingPlayers() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE * 3);
        game.joinBattle();
        game.joinBattle();
        game.joinBattle();
        vm.stopPrank();

        (,,,, uint256 prizePool, uint256 playerCount) = game.getSessionInfo(1);
        assertEq(playerCount, 1);
        assertEq(prizePool, ENTRY_FEE * 3);
    }

    // ============ Scoring ============

    function test_SubmitScoresForSession() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        address[] memory players = new address[](1);
        players[0] = player1;
        uint256[] memory scores = new uint256[](1);
        scores[0] = 1500;

        vm.prank(owner);
        game.submitScoresForSession(1, players, scores);

        assertEq(game.getPlayerScoreForSession(1, player1), 1500);
    }

    function test_CanSubmitScoresForClosedSessionAfterRollover() public {
        // Simulate ticketed design: player paid in session 1, session rolls to 2,
        // then scores for session 1 are submitted and distributed.
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        // Wait for session 1 to end and start session 2
        vm.warp(block.timestamp + SESSION_INTERVAL + 1);
        vm.prank(owner);
        game.startNewSession();

        assertEq(game.sessionCounter(), 2);

        address[] memory players = new address[](1);
        players[0] = player1;
        uint256[] memory scores = new uint256[](1);
        scores[0] = 2000;

        vm.prank(owner);
        game.submitScoresForSession(1, players, scores);

        assertEq(game.getPlayerScoreForSession(1, player1), 2000);
        assertEq(game.getPlayerScoreForSession(2, player1), 0);
    }

    // ============ Prize Distribution ============

    function test_DistributePrizesForSession() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.startPrank(player2);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.startPrank(player3);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.warp(block.timestamp + SESSION_INTERVAL + 1);

        address[] memory players = new address[](3);
        players[0] = player3; // 1st
        players[1] = player1; // 2nd
        players[2] = player2; // 3rd
        uint256[] memory scores = new uint256[](3);
        scores[0] = 3000;
        scores[1] = 2000;
        scores[2] = 1000;

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        uint256 p1BalanceBefore = usdc.balanceOf(player1);
        uint256 p2BalanceBefore = usdc.balanceOf(player2);
        uint256 p3BalanceBefore = usdc.balanceOf(player3);

        vm.prank(owner);
        game.syncAndDistributeForSession(1, players, scores);

        uint256 totalPool = ENTRY_FEE * 3;
        uint256 platformFee = (totalPool * 10) / 100;
        uint256 winnerPool = totalPool - platformFee;

        uint256 firstPrize = (winnerPool * 60) / 100;
        uint256 secondPrize = (winnerPool * 30) / 100;
        uint256 thirdPrize = winnerPool - firstPrize - secondPrize;

        assertEq(usdc.balanceOf(owner) - ownerBalanceBefore, platformFee);
        assertEq(usdc.balanceOf(player3) - p3BalanceBefore, firstPrize);
        assertEq(usdc.balanceOf(player1) - p1BalanceBefore, secondPrize);
        assertEq(usdc.balanceOf(player2) - p2BalanceBefore, thirdPrize);

        (,,,, uint256 prizePool, uint256 playerCount) = game.getSessionInfo(1);
        assertEq(prizePool, totalPool);
    }

    function test_DistributePrizesForOldSessionAfterRollover() public {
        // Ticketed scenario: distribute session 1 after session 2 has started.
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.startPrank(player2);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.warp(block.timestamp + SESSION_INTERVAL + 1);

        vm.prank(owner);
        game.startNewSession();

        address[] memory players = new address[](2);
        players[0] = player2;
        players[1] = player1;
        uint256[] memory scores = new uint256[](2);
        scores[0] = 500;
        scores[1] = 400;

        uint256 p1Before = usdc.balanceOf(player1);
        uint256 p2Before = usdc.balanceOf(player2);

        vm.prank(owner);
        game.syncAndDistributeForSession(1, players, scores);

        assertGt(usdc.balanceOf(player2) - p2Before, 0);
        assertGt(usdc.balanceOf(player1) - p1Before, 0);

        (bool isActiveAfter, bool distributed,,,,) = game.getSessionInfo(1);
        assertFalse(isActiveAfter);
        assertTrue(distributed);
    }

    // ============ Edge Cases ============

    function test_CannotStartNewSessionIfActive() public {
        vm.prank(owner);
        game.startNewSession();

        vm.prank(owner);
        vm.expectRevert(TriviaBattlev5.TriviaBattle__SessionAlreadyActive.selector);
        game.startNewSession();
    }

    function test_CannotJoinWithoutEnoughBalance() public {
        vm.prank(owner);
        game.startNewSession();

        address brokePlayer = address(0xBAD);

        vm.startPrank(brokePlayer);
        usdc.approve(address(game), ENTRY_FEE);
        vm.expectRevert(TriviaBattlev5.TriviaBattle__InsufficientEntryFee.selector);
        game.joinBattle();
        vm.stopPrank();
    }

    function test_CannotDistributeBeforeDeadline() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert(TriviaBattlev5.TriviaBattle__SessionDeadlineNotElapsed.selector);
        game.distributePrizes(1);
    }

    function test_CannotDistributeTwice() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.warp(block.timestamp + SESSION_INTERVAL + 1);

        address[] memory players = new address[](1);
        players[0] = player1;
        uint256[] memory scores = new uint256[](1);
        scores[0] = 1000;

        vm.prank(owner);
        game.syncAndDistributeForSession(1, players, scores);

        vm.prank(owner);
        vm.expectRevert(TriviaBattlev5.TriviaBattle__SessionAlreadyDistributed.selector);
        game.distributePrizes(1);
    }

    function test_EmergencyWithdrawalFlow() public {
        vm.prank(owner);
        game.startNewSession();

        vm.startPrank(player1);
        usdc.approve(address(game), ENTRY_FEE);
        game.joinBattle();
        vm.stopPrank();

        vm.prank(owner);
        game.initiateEmergencyWithdraw();

        uint256 lockedAmount = game.getPendingWithdrawal(owner);
        assertEq(lockedAmount, ENTRY_FEE);

        uint256 ownerBefore = usdc.balanceOf(owner);

        vm.warp(block.timestamp + game.timeLockDelay() + 1);

        vm.prank(owner);
        game.executeWithdrawal();

        assertEq(usdc.balanceOf(owner) - ownerBefore, ENTRY_FEE);
        assertEq(game.getPendingWithdrawal(owner), 0);
    }

    function testFuzz_PlatformFeeIsTenPercent(uint96 entries) public {
        uint256 count = bound(entries, 1, 10);
        vm.prank(owner);
        game.startNewSession();

        for (uint256 i = 0; i < count; i++) {
            address player = address(uint160(i + 1000));
            usdc.mint(player, ENTRY_FEE);
            vm.startPrank(player);
            usdc.approve(address(game), ENTRY_FEE);
            game.joinBattle();
            vm.stopPrank();
        }

        vm.warp(block.timestamp + SESSION_INTERVAL + 1);

        address[] memory players = new address[](count);
        uint256[] memory scores = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            players[i] = address(uint160(i + 1000));
            scores[i] = (i + 1) * 100;
        }

        uint256 ownerBefore = usdc.balanceOf(owner);
        uint256 totalPool = ENTRY_FEE * count;
        uint256 expectedPlatformFee = (totalPool * 10) / 100;

        vm.prank(owner);
        game.syncAndDistributeForSession(1, players, scores);

        assertEq(usdc.balanceOf(owner) - ownerBefore, expectedPlatformFee);
    }
}
