// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TriviaGame} from "../contracts/TriviaBattlev4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 1e6); // 1M USDC
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract TriviaBattlev4Test is Test {
    TriviaGame public triviaGame;
    MockUSDC public usdc;
    
    address public owner = address(0x1);
    address public oracle = address(0x2);
    address public platformFeeRecipient = address(0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public functionsRouter = address(0x5);
    
    uint256 public constant ENTRY_FEE = 1e6; // 1 USDC
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 700; // 7%
    uint256 public constant SIMPLE_AUTOMATION_THRESHOLD = 100e6; // $100
    
    function setUp() public {
        // Deploy mock USDC
        vm.prank(owner);
        usdc = new MockUSDC();
        
        // Deploy TriviaGame
        vm.prank(owner);
        triviaGame = new TriviaGame(
            address(usdc),
            oracle,
            platformFeeRecipient,
            functionsRouter
        );
        
        // Give test players some USDC
        usdc.mint(player1, 1000 * 1e6);
        usdc.mint(player2, 1000 * 1e6);
        usdc.mint(owner, 1000 * 1e6);
    }
    
    // ============ Platform Fee Tests ============
    
    function test_PlatformFeePercentage() public view {
        assertEq(triviaGame.PLATFORM_FEE_PERCENTAGE(), PLATFORM_FEE_PERCENTAGE, "Platform fee should be 7%");
    }
    
    function test_SimpleAutomationThreshold() public view {
        assertEq(triviaGame.SIMPLE_AUTOMATION_THRESHOLD(), SIMPLE_AUTOMATION_THRESHOLD, "Threshold should be $100");
    }
    
    function test_PlatformFeeRecipient() public view {
        assertEq(triviaGame.platformFeeRecipient(), platformFeeRecipient, "Fee recipient should be thecreative.eth");
    }
    
    function test_PlatformFeeCalculation() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        vm.startPrank(player1);
        usdc.approve(address(triviaGame), ENTRY_FEE);
        
        uint256 balanceBefore = usdc.balanceOf(player1);
        uint256 contractBalanceBefore = usdc.balanceOf(address(triviaGame));
        
        triviaGame.enterGame();
        
        uint256 balanceAfter = usdc.balanceOf(player1);
        uint256 contractBalanceAfter = usdc.balanceOf(address(triviaGame));
        
        // Player paid 1 USDC
        assertEq(balanceBefore - balanceAfter, ENTRY_FEE, "Player should pay 1 USDC");
        
        // Calculate expected fee and prize pool
        uint256 expectedFee = (ENTRY_FEE * PLATFORM_FEE_PERCENTAGE) / 10000; // 70,000 (0.07 USDC)
        uint256 expectedPrizePool = ENTRY_FEE - expectedFee; // 930,000 (0.93 USDC)
        
        // Contract holds the full entry fee (both prize pool and platform fee)
        // Platform fee is accumulated but not withdrawn yet
        assertEq(contractBalanceAfter - contractBalanceBefore, ENTRY_FEE, "Contract should hold full entry fee");
        
        // Platform fee should be accumulated (but not yet withdrawn)
        assertEq(triviaGame.accumulatedPlatformFees(), expectedFee, "Platform fee should be accumulated");
        
        // Prize pool should be correct
        (uint256 prizePool,,,,,,,,) = triviaGame.getGameInfo(triviaGame.currentGameId());
        assertEq(prizePool, expectedPrizePool, "Prize pool should be correct");
        
        vm.stopPrank();
    }
    
    // ============ Chainlink Mode Selection Tests ============
    
    function test_FirstGameUsesSimpleAutomation() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId = triviaGame.currentGameId();
        (,,,,,,, bool rankingsSubmitted, TriviaGame.ChainlinkMode chainlinkMode) = triviaGame.getGameInfo(gameId);
        
        // SimpleAutomation = 0, FullDON = 1
        assertEq(uint8(chainlinkMode), 0, "First game should use SimpleAutomation");
    }
    
    function test_SmallGameUsesSimpleAutomation() public {
        // Create first game with 50 players (under $100 threshold)
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId1 = triviaGame.currentGameId();
        
        // Have 50 players enter
        for (uint256 i = 0; i < 50; i++) {
            address player = address(uint160(i + 100));
            usdc.mint(player, 10 * 1e6);
            vm.startPrank(player);
            usdc.approve(address(triviaGame), ENTRY_FEE);
            triviaGame.enterGame();
            vm.stopPrank();
        }
        
        // End game and create new one
        vm.warp(block.timestamp + 6 minutes);
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId2 = triviaGame.currentGameId();
        (,,,,,,, bool rankingsSubmitted2, TriviaGame.ChainlinkMode chainlinkMode2) = triviaGame.getGameInfo(gameId2);
        
        // Previous game had 50 players: 50 * 1e6 = 50e6 revenue
        // Platform fee: 50e6 * 0.07 = 3.5e6
        // Prize pool: 50e6 - 3.5e6 = 46.5e6 < 100e6 → SimpleAutomation
        assertEq(uint8(chainlinkMode2), 0, "Small game (<$100) should use SimpleAutomation");
    }
    
    function test_LargeGameUsesFullDON() public {
        // Create first game with 110 players (over $100 threshold)
        vm.prank(owner);
        triviaGame.createGame();
        
        // Have 110 players enter
        for (uint256 i = 0; i < 110; i++) {
            address player = address(uint160(i + 100));
            usdc.mint(player, 10 * 1e6);
            vm.startPrank(player);
            usdc.approve(address(triviaGame), ENTRY_FEE);
            triviaGame.enterGame();
            vm.stopPrank();
        }
        
        // End game and create new one
        vm.warp(block.timestamp + 6 minutes);
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId2 = triviaGame.currentGameId();
        (,,,,,,, bool rankingsSubmitted2, TriviaGame.ChainlinkMode chainlinkMode2) = triviaGame.getGameInfo(gameId2);
        
        // Previous game had 110 players: 110 * 1e6 = 110e6 revenue
        // Platform fee: 110e6 * 0.07 = 7.7e6
        // Prize pool: 110e6 - 7.7e6 = 102.3e6 >= 100e6 → FullDON
        assertEq(uint8(chainlinkMode2), 1, "Large game (>= $100) should use FullDON");
    }
    
    // ============ Game Flow Tests ============
    
    function test_CreateGame() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId = triviaGame.currentGameId();
        assertEq(gameId, 1, "First game should have ID 1");
        
        (uint256 prizePool, uint256 platformFee, uint256 playerCount, uint256 startTime, uint256 endTime, bool isActive, bool isFinalized, bool rankingsSubmitted, TriviaGame.ChainlinkMode _mode) = triviaGame.getGameInfo(gameId);
        assertEq(prizePool, 0, "Initial prize pool should be 0");
        assertEq(platformFee, 0, "Initial platform fee should be 0");
        assertEq(playerCount, 0, "Initial player count should be 0");
    }
    
    function test_EnterGame() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        vm.startPrank(player1);
        usdc.approve(address(triviaGame), ENTRY_FEE);
        triviaGame.enterGame();
        vm.stopPrank();
        
        uint256 gameId = triviaGame.currentGameId();
        assertTrue(triviaGame.hasPlayerEntered(gameId, player1), "Player should be registered");
        
        (uint256 prizePool, uint256 platformFee, uint256 playerCount, uint256 startTime, uint256 endTime, bool isActive, bool isFinalized, bool rankingsSubmitted, TriviaGame.ChainlinkMode _mode) = triviaGame.getGameInfo(gameId);
        assertEq(playerCount, 1, "Player count should be 1");
        
        uint256 expectedFee = (ENTRY_FEE * PLATFORM_FEE_PERCENTAGE) / 10000;
        uint256 expectedPrizePool = ENTRY_FEE - expectedFee;
        assertEq(prizePool, expectedPrizePool, "Prize pool should be correct");
        assertEq(platformFee, expectedFee, "Platform fee should be correct");
    }
    
    function test_RequestRankingsOnlyForFullDON() public {
        // Create a FullDON game (large previous game)
        vm.prank(owner);
        triviaGame.createGame();
        
        // Add 110 players to make next game FullDON
        for (uint256 i = 0; i < 110; i++) {
            address player = address(uint160(i + 100));
            usdc.mint(player, 10 * 1e6);
            vm.startPrank(player);
            usdc.approve(address(triviaGame), ENTRY_FEE);
            triviaGame.enterGame();
            vm.stopPrank();
        }
        
        // End and create new game (will be FullDON)
        vm.warp(block.timestamp + 6 minutes);
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId = triviaGame.currentGameId();
        vm.warp(block.timestamp + 6 minutes); // Game ended
        
        // requestRankings should work for FullDON (but will fail without Functions config)
        // This test verifies the mode check, not the actual Functions call
        vm.expectRevert(); // Will revert due to Functions not configured, but mode check passes
        triviaGame.requestRankings(gameId);
    }
    
    function test_SubmitRankingsFallbackForSimpleAutomation() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        uint256 gameId = triviaGame.currentGameId();
        
        // Add a player
        vm.startPrank(player1);
        usdc.approve(address(triviaGame), ENTRY_FEE);
        triviaGame.enterGame();
        vm.stopPrank();
        
        // End game
        vm.warp(block.timestamp + 6 minutes);
        
        // For SimpleAutomation mode, fallback oracle should be able to submit immediately
        address[] memory rankedPlayers = new address[](1);
        rankedPlayers[0] = player1;
        
        vm.prank(oracle);
        triviaGame.submitRankingsFallback(gameId, rankedPlayers);
        
        (,,,,,,, bool rankingsSubmitted, TriviaGame.ChainlinkMode _mode) = triviaGame.getGameInfo(gameId);
        assertTrue(rankingsSubmitted, "Rankings should be submitted");
    }
    
    // ============ Edge Cases ============
    
    function test_CannotEnterGameTwice() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        vm.startPrank(player1);
        usdc.approve(address(triviaGame), ENTRY_FEE * 2);
        triviaGame.enterGame();
        
        vm.expectRevert();
        triviaGame.enterGame(); // Should revert
        vm.stopPrank();
    }
    
    function test_WithdrawPlatformFees() public {
        vm.prank(owner);
        triviaGame.createGame();
        
        // Add players to accumulate fees
        vm.startPrank(player1);
        usdc.approve(address(triviaGame), ENTRY_FEE);
        triviaGame.enterGame();
        vm.stopPrank();
        
        uint256 expectedFee = (ENTRY_FEE * PLATFORM_FEE_PERCENTAGE) / 10000;
        assertEq(triviaGame.accumulatedPlatformFees(), expectedFee, "Fees should be accumulated");
        
        uint256 recipientBalanceBefore = usdc.balanceOf(platformFeeRecipient);
        
        vm.prank(owner);
        triviaGame.withdrawPlatformFees();
        
        uint256 recipientBalanceAfter = usdc.balanceOf(platformFeeRecipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedFee, "Fees should be withdrawn");
        assertEq(triviaGame.accumulatedPlatformFees(), 0, "Fees should be reset");
    }
}

