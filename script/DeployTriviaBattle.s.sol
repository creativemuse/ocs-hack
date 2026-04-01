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
    address constant BASE_SEPOLIA_LINK = 0xE4aB69C077896252FAFBD49EFD26B5D171A32410;
    // Chainlink Functions addresses - set to zero address if not using Chainlink Functions yet
    address constant BASE_SEPOLIA_CHAINLINK_FUNCTIONS = address(0);
    address constant BASE_SEPOLIA_CHAINLINK_ORACLE = address(0);

    // Base Mainnet addresses
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant BASE_MAINNET_LINK = 0x88DFAAABAf06f3A41d260Bea10568C1B4794334C;
    // Chainlink Functions addresses - set to zero address if not using Chainlink Functions yet
    address constant BASE_MAINNET_CHAINLINK_FUNCTIONS = address(0);
    /// @dev Base Keystone forwarder — CRE `writeReport` calls `onReport` from this address.
    address constant BASE_MAINNET_KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482;
    address constant BASE_MAINNET_CHAINLINK_ORACLE = BASE_MAINNET_KEYSTONE_FORWARDER;

    // Configuration constants
    /// @dev Minimum is 10 minutes (contract MIN_SESSION_INTERVAL). Use a short interval so players can start new rounds after a session ends.
    uint256 constant SESSION_INTERVAL = 10 minutes;
    uint256 constant ENTRY_FEE = 1e6; // 1 USDC (6 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Detect network from chain ID
        uint256 chainId = block.chainid;
        address usdcAddress;
        address linkAddress;
        address chainlinkFunctionsAddress;
        address chainlinkOracleAddress;
        string memory networkName;

        if (chainId == 84532) {
            // Base Sepolia
            networkName = "Base Sepolia";
            usdcAddress = BASE_SEPOLIA_USDC;
            linkAddress = BASE_SEPOLIA_LINK;
            chainlinkFunctionsAddress = BASE_SEPOLIA_CHAINLINK_FUNCTIONS;
            chainlinkOracleAddress = BASE_SEPOLIA_CHAINLINK_ORACLE;

            // Warn if Chainlink addresses are zero (they can be set later)
            if (BASE_SEPOLIA_CHAINLINK_FUNCTIONS == address(0) || BASE_SEPOLIA_CHAINLINK_ORACLE == address(0)) {
                console.log("NOTE: Chainlink addresses are zero. This is allowed.");
                console.log("Update them after deployment using:");
                console.log("  - setChainlinkFunctions(address)");
                console.log("  - setChainlinkOracle(address)");
            }
        } else if (chainId == 8453) {
            // Base Mainnet
            networkName = "Base Mainnet";
            usdcAddress = BASE_MAINNET_USDC;
            linkAddress = BASE_MAINNET_LINK;
            chainlinkFunctionsAddress = BASE_MAINNET_CHAINLINK_FUNCTIONS;
            chainlinkOracleAddress = BASE_MAINNET_CHAINLINK_ORACLE;

            // Warn if Chainlink addresses are zero (they can be set later)
            if (BASE_MAINNET_CHAINLINK_FUNCTIONS == address(0)) {
                console.log("NOTE: Chainlink Functions address is zero. Set via setChainlinkFunctions when ready.");
            }
            console.log("Keystone forwarder (chainlinkOracle):", chainlinkOracleAddress);
        } else {
            revert("Unsupported network. Use Base Sepolia (84532) or Base Mainnet (8453)");
        }

        console.log("Deploying TriviaBattle to:", networkName);
        console.log("Chain ID:", chainId);
        console.log("USDC Address:", usdcAddress);
        console.log("LINK Address:", linkAddress);
        console.log("Chainlink Functions:", chainlinkFunctionsAddress);
        console.log("Chainlink Oracle:", chainlinkOracleAddress);
        console.log("Session Interval:", SESSION_INTERVAL);
        console.log("Entry Fee:", ENTRY_FEE);

        // Deploy contract
        TriviaBattle triviaBattle = new TriviaBattle(
            usdcAddress, linkAddress, chainlinkFunctionsAddress, chainlinkOracleAddress, SESSION_INTERVAL, ENTRY_FEE
        );

        console.log("TriviaBattle deployed at:", address(triviaBattle));
        console.log("Owner:", triviaBattle.owner());

        vm.stopBroadcast();
    }
}
