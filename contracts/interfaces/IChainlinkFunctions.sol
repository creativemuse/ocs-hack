// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IChainlinkFunctions
 * @notice Minimal interface for Chainlink Functions integration
 */
interface IChainlinkFunctions {
    struct OracleRequest {
        bytes32 requestId;
        address requester;
        bytes data;
    }

    function requestOracleData(
        address oracle,
        bytes memory params,
        bytes32 jobId,
        bytes4 interfaceId,
        uint256 chainId,
        address callbackAddress,
        bytes32 callbackSelector
    ) external payable returns (bytes32);
}
