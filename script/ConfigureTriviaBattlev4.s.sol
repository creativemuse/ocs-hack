// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TriviaGame} from "../contracts/TriviaBattlev4.sol";

contract ConfigureTriviaBattlev4 is Script {
    // Deployed contract address
    address constant TRIVIA_GAME_ADDRESS = 0xd8F082fa4EF6a4C59F8366c19a196d488485682b;
    
    // Chainlink Functions configuration
    uint64 constant SUBSCRIPTION_ID = 102;
    uint32 constant GAS_LIMIT = 300000;
    bytes32 constant DON_ID = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;
    
    // Minified JavaScript source code for Chainlink Functions
    string constant RANKING_SOURCE = 'const gameId = args[0];if (!gameId || isNaN(parseInt(gameId))) throw new Error(`Invalid gameId: ${gameId}`);const apiUrl = `https://beatme.creativeplatform.xyz/api/chainlink/game-rankings/${gameId}`;try {const response = await Functions.makeHttpRequest({url: apiUrl,method: "GET",timeout: 9000,headers: { \'User-Agent\': \'Chainlink-Functions-DON/1.0\', \'Accept\': \'application/json\' }});if (response.error) throw new Error(`API Error: ${response.error}`);if (response.statusCode !== 200) throw new Error(`HTTP Error: ${response.statusCode}`);if (!response.data) throw new Error(\'No data received from API\');const { gameId: returnedGameId, rankings } = response.data;if (!Array.isArray(rankings)) throw new Error(\'Invalid response format: rankings must be an array\');if (returnedGameId !== parseInt(gameId)) throw new Error(`GameId mismatch: expected ${gameId}, got ${returnedGameId}`);for (let i = 0; i < rankings.length; i++) {const address = rankings[i];if (typeof address !== \'string\' || address.length < 10) {throw new Error(`Invalid address at position ${i}: ${address}`);}}return Functions.encodeString(JSON.stringify(rankings));} catch (error) {return Functions.encodeString(JSON.stringify([]));}';

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Configuring TriviaBattlev4 Chainlink Functions...");
        console.log("Contract Address:", TRIVIA_GAME_ADDRESS);
        console.log("Subscription ID:", SUBSCRIPTION_ID);
        console.log("Gas Limit:", GAS_LIMIT);
        console.log("DON ID:", vm.toString(DON_ID));
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Get the contract instance
        TriviaGame triviaGame = TriviaGame(TRIVIA_GAME_ADDRESS);
        
        // Configure Chainlink Functions
        triviaGame.updateFunctionsConfig(
            SUBSCRIPTION_ID,
            GAS_LIMIT,
            DON_ID,
            RANKING_SOURCE
        );
        
        vm.stopBroadcast();
        
        console.log("Chainlink Functions configuration completed!");
        console.log("Contract is now ready for decentralized ranking submission.");
    }
}
