// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AutomationCounter} from "../contracts/AutomationCounter.sol";

/**
 * @title DeployAutomationCounter
 * @notice Deployment script for AutomationCounter contract
 * @dev Run with: forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployAutomationCounter is Script {
    // Default update interval: 60 seconds for testing, adjust as needed
    uint256 constant DEFAULT_UPDATE_INTERVAL = 60;

    function run() external {
        // Get the update interval from environment variable or use default
        uint256 updateInterval = vm.envOr("UPDATE_INTERVAL", DEFAULT_UPDATE_INTERVAL);

        // Get the deployer's private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("=================================");
        console.log("Deploying AutomationCounter");
        console.log("=================================");
        console.log("Update Interval:", updateInterval, "seconds");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);
        console.log("=================================");

        vm.startBroadcast(deployerPrivateKey);

        AutomationCounter counter = new AutomationCounter(updateInterval);

        vm.stopBroadcast();

        console.log("\n=================================");
        console.log("Deployment Complete!");
        console.log("=================================");
        console.log("AutomationCounter deployed to:", address(counter));
        console.log("Update Interval:", counter.INTERVAL(), "seconds");
        console.log("Initial Counter Value:", counter.counter());
        console.log("=================================");
        console.log("\nNext Steps:");
        console.log("1. Copy the contract address above");
        console.log("2. Go to https://automation.chain.link/");
        console.log("3. Click 'Register new Upkeep'");
        console.log("4. Select 'Custom logic' trigger");
        console.log("5. Paste the contract address");
        console.log("6. Fund the upkeep with LINK tokens");
        console.log("=================================");
    }
}

