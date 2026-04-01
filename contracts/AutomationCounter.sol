// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title AutomationCounter
 * @notice Example contract demonstrating Chainlink Automation with custom logic trigger
 * @dev This contract automatically increments a counter based on a time interval
 *
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION WITHOUT PROPER AUDITING.
 */
contract AutomationCounter is AutomationCompatibleInterface {
    /**
     * @notice Public counter variable that gets incremented
     */
    uint256 public counter;

    /**
     * @notice Interval in seconds between upkeeps
     */
    uint256 public immutable INTERVAL;

    /**
     * @notice Last timestamp when upkeep was performed
     */
    uint256 public lastTimeStamp;

    /**
     * @notice Event emitted when counter is incremented
     */
    event CounterIncremented(uint256 newCounterValue, uint256 timestamp);

    /**
     * @notice Constructor sets the update interval
     * @param updateInterval Time in seconds between counter increments
     */
    constructor(uint256 updateInterval) {
        require(updateInterval > 0, "Interval must be greater than 0");
        INTERVAL = updateInterval;
        lastTimeStamp = block.timestamp;
        counter = 0;
    }

    /**
     * @notice Checks if upkeep is needed
     * @dev This function is called offchain by Chainlink Automation nodes
     * @return upkeepNeeded True if performUpkeep should be called
     * @return performData Data to pass to performUpkeep (not used in this example)
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > INTERVAL;
        performData = new bytes(0);
    }

    /**
     * @notice Performs the upkeep
     * @dev This function is called onchain by Chainlink Automation when checkUpkeep returns true
     */
    function performUpkeep(
        bytes calldata /* performData */
    )
        external
        override
    {
        // Revalidate the condition to prevent front-running
        if ((block.timestamp - lastTimeStamp) > INTERVAL) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
            emit CounterIncremented(counter, block.timestamp);
        }
    }

    /**
     * @notice Get the time until next upkeep
     * @return secondsRemaining Seconds until next upkeep is due
     */
    function getTimeUntilNextUpkeep() external view returns (uint256 secondsRemaining) {
        uint256 timePassed = block.timestamp - lastTimeStamp;
        if (timePassed >= INTERVAL) {
            return 0;
        }
        return INTERVAL - timePassed;
    }
}

