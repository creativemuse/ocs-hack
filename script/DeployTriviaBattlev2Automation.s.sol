// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TriviaGame} from "../contracts/TriviaBattlev2.sol";

/**
 * @title DeployTriviaBattlev2Automation
 * @notice Deployment script for TriviaGame contract with Chainlink Automation
 * @dev Run with: forge script script/DeployTriviaBattlev2Automation.s.sol:DeployTriviaBattlev2Automation --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployTriviaBattlev2Automation is Script {
    function run() external {
        // Get configuration from environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address gameOracle = vm.envAddress("GAME_ORACLE_ADDRESS");
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        console.log("=================================");
        console.log("Deploying TriviaGame with Automation");
        console.log("=================================");
        console.log("USDC Address:", usdcAddress);
        console.log("Game Oracle:", gameOracle);
        console.log("Platform Fee Recipient:", platformFeeRecipient);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);
        console.log("=================================");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the TriviaGame contract
        TriviaGame game = new TriviaGame(
            usdcAddress,
            gameOracle,
            platformFeeRecipient
        );

        vm.stopBroadcast();

        console.log("\n=================================");
        console.log("Deployment Complete!");
        console.log("=================================");
        console.log("TriviaGame deployed to:", address(game));
        console.log("Entry Fee: 1 USDC");
        console.log("Game Duration: 5 minutes");
        console.log("Platform Fee: 3%");
        console.log("=================================");
        console.log("\nNext Steps:");
        console.log("1. Copy the contract address above");
        console.log("2. Get testnet LINK tokens from: https://faucets.chain.link/sepolia");
        console.log("3. Register upkeep at: https://automation.chain.link/sepolia");
        console.log("4. Select 'Custom logic' trigger");
        console.log("5. Paste the contract address");
        console.log("6. Set gas limit: 500,000");
        console.log("7. Fund with 10 LINK tokens");
        console.log("8. Test by creating a game!");
        console.log("=================================");
        console.log("\nGame Flow:");
        console.log("1. Owner calls createGame()");
        console.log("2. Players call enterGame() (pay 1 USDC)");
        console.log("3. Game runs for 5 minutes");
        console.log("4. Oracle calls submitRankings()");
        console.log("5. Chainlink Automation auto-finalizes!");
        console.log("6. Winners call claimPrize()");
        console.log("=================================");
    }
}
