// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TriviaGame} from "../contracts/TriviaBattlev4.sol";

contract DeployTriviaBattlev4 is Script {
    // Base Sepolia USDC address
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Base Mainnet USDC address
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Chainlink Functions Router addresses
    address constant BASE_SEPOLIA_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    address constant BASE_MAINNET_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;

    // Chainlink Functions DON IDs
    bytes32 constant BASE_SEPOLIA_DON_ID = 0x66756f2d626173652d7365706f6c69612d310000000000000000000000000000;
    bytes32 constant BASE_MAINNET_DON_ID = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;

    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameOracle = vm.envAddress("GAME_ORACLE_ADDRESS");
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");
        uint64 subscriptionId = uint64(vm.envUint("FUNCTIONS_SUBSCRIPTION_ID"));
        string memory backendApiUrl = vm.envString("BACKEND_API_URL");

        // Determine which USDC address to use based on chain ID
        uint256 chainId = block.chainid;
        address usdcAddress;
        address functionsRouter;
        bytes32 donID;

        if (chainId == 84532) {
            // Base Sepolia
            usdcAddress = BASE_SEPOLIA_USDC;
            functionsRouter = BASE_SEPOLIA_FUNCTIONS_ROUTER;
            donID = BASE_SEPOLIA_DON_ID;
            console.log("Deploying to Base Sepolia");
        } else if (chainId == 8453) {
            // Base Mainnet
            usdcAddress = BASE_MAINNET_USDC;
            functionsRouter = BASE_MAINNET_FUNCTIONS_ROUTER;
            donID = BASE_MAINNET_DON_ID;
            console.log("Deploying to Base Mainnet");
        } else {
            revert("Unsupported chain ID");
        }

        console.log("USDC Address:", usdcAddress);
        console.log("Game Oracle:", gameOracle);
        console.log("Platform Fee Recipient:", platformFeeRecipient);
        console.log("Functions Router:", functionsRouter);
        console.log("Subscription ID:", subscriptionId);
        console.log("DON ID:", vm.toString(donID));
        console.log("Backend API URL:", backendApiUrl);

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        TriviaGame triviaGame = new TriviaGame(usdcAddress, gameOracle, platformFeeRecipient, functionsRouter);

        vm.stopBroadcast();

        console.log("TriviaGame deployed at:", address(triviaGame));

        // Post-deployment configuration
        console.log("\n=== Post-Deployment Configuration ===");
        console.log("1. Add contract as consumer to subscription", subscriptionId);
        console.log("2. Call updateFunctionsConfig() with:");
        console.log("   - subscriptionId:", subscriptionId);
        console.log("   - gasLimit: 300000");
        console.log("   - donID:", vm.toString(donID));
        console.log("   - rankingSource: [JavaScript source code]");
        console.log("3. Test the integration with a sample game");

        console.log("\n=== Deployment Summary ===");
        console.log("Contract:", address(triviaGame));
        console.log("USDC:", usdcAddress);
        console.log("Oracle:", gameOracle);
        console.log("Fee Recipient:", platformFeeRecipient);
        console.log("Functions Router:", functionsRouter);
        console.log("Entry Fee:", triviaGame.ENTRY_FEE());
        console.log("Platform Fee:", triviaGame.PLATFORM_FEE_PERCENTAGE(), "basis points (7%)");
        console.log("Game Duration:", triviaGame.GAME_DURATION());

        // Generate the updateFunctionsConfig call
        console.log("\n=== updateFunctionsConfig Call ===");
        console.log("Call this function on the deployed contract:");
        console.log("triviaGame.updateFunctionsConfig(");
        console.log("    ", subscriptionId, ", // subscriptionId");
        console.log("    300000, // gasLimit");
        console.log("    ", vm.toString(donID), ", // donID");
        console.log("    \"[YOUR_JAVASCRIPT_SOURCE_CODE]\" // rankingSource");
        console.log(");");
    }
}
