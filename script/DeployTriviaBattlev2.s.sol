// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TriviaGame} from "../contracts/TriviaBattlev2.sol";

contract DeployTriviaBattlev2 is Script {
    // Base Sepolia USDC address
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Base Mainnet USDC address
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameOracle = vm.envAddress("GAME_ORACLE_ADDRESS");
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        // Determine which USDC address to use based on chain ID
        uint256 chainId = block.chainid;
        address usdcAddress;

        if (chainId == 84532) {
            // Base Sepolia
            usdcAddress = BASE_SEPOLIA_USDC;
            console.log("Deploying to Base Sepolia");
        } else if (chainId == 8453) {
            // Base Mainnet
            usdcAddress = BASE_MAINNET_USDC;
            console.log("Deploying to Base Mainnet");
        } else {
            revert("Unsupported chain ID");
        }

        console.log("USDC Address:", usdcAddress);
        console.log("Game Oracle:", gameOracle);
        console.log("Platform Fee Recipient:", platformFeeRecipient);

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        TriviaGame triviaGame = new TriviaGame(usdcAddress, gameOracle, platformFeeRecipient);

        vm.stopBroadcast();

        console.log("TriviaGame deployed at:", address(triviaGame));
        console.log("\n=== Deployment Summary ===");
        console.log("Contract:", address(triviaGame));
        console.log("USDC:", usdcAddress);
        console.log("Oracle:", gameOracle);
        console.log("Fee Recipient:", platformFeeRecipient);
        console.log("Entry Fee:", triviaGame.ENTRY_FEE());
        console.log("Platform Fee:", triviaGame.PLATFORM_FEE_PERCENTAGE(), "basis points (3%)");
    }
}

