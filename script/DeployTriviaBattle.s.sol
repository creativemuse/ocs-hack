// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {TriviaBattle} from "../contracts/TriviaBattle.sol";

/**
 * @title DeployTriviaBattle
 * @notice Deployment script for TriviaBattle contract on Base networks
 *
 * Usage:
 *   forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle --rpc-url base_sepolia --broadcast --verify
 *   forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle --rpc-url base_mainnet --broadcast --verify
 */
contract DeployTriviaBattle is Script {
    // Base Sepolia addresses
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Base Mainnet addresses
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Detect network from chain ID
        uint256 chainId = block.chainid;
        address usdcAddress;
        string memory networkName;

        if (chainId == 84532) {
            // Base Sepolia
            networkName = "Base Sepolia";
            usdcAddress = BASE_SEPOLIA_USDC;
        } else if (chainId == 8453) {
            // Base Mainnet
            networkName = "Base Mainnet";
            usdcAddress = BASE_MAINNET_USDC;
        } else {
            revert("Unsupported network. Use Base Sepolia (84532) or Base Mainnet (8453)");
        }

        console.log("Deploying TriviaBattle to:", networkName);
        console.log("Chain ID:", chainId);
        console.log("USDC Address:", usdcAddress);
        console.log("Platform Fee Recipient:", deployer);

        // Deploy contract — constructor(address _usdcToken, address _platformFeeRecipient)
        // Platform fee recipient defaults to deployer; update via updatePlatformFeeRecipient() after deploy
        TriviaBattle triviaBattle = new TriviaBattle(usdcAddress, deployer);

        console.log("TriviaBattle deployed at:", address(triviaBattle));
        console.log("Owner:", triviaBattle.owner());

        vm.stopBroadcast();
    }
}
