/**
 * Minified Chainlink Functions Source Code for TriviaGame Rankings
 * 
 * This is the optimized version for production use to minimize gas costs.
 * The DON nodes will reach consensus on the rankings before submitting to the contract.
 */

const gameId = args[0];
if (!gameId || isNaN(parseInt(gameId))) throw new Error(`Invalid gameId: ${gameId}`);

const apiUrl = `https://beatme.creativeplatform.xyz/api/chainlink/game-rankings/${gameId}`;

try {
  const response = await Functions.makeHttpRequest({
    url: apiUrl,
    method: "GET",
    timeout: 9000,
    headers: { 'User-Agent': 'Chainlink-Functions-DON/1.0', 'Accept': 'application/json' }
  });

  if (response.error) throw new Error(`API Error: ${response.error}`);
  if (response.statusCode !== 200) throw new Error(`HTTP Error: ${response.statusCode}`);
  if (!response.data) throw new Error('No data received from API');

  const { gameId: returnedGameId, rankings } = response.data;
  
  if (!Array.isArray(rankings)) throw new Error('Invalid response format: rankings must be an array');
  if (returnedGameId !== parseInt(gameId)) throw new Error(`GameId mismatch: expected ${gameId}, got ${returnedGameId}`);

  for (let i = 0; i < rankings.length; i++) {
    const address = rankings[i];
    if (typeof address !== 'string' || address.length < 10) {
      throw new Error(`Invalid address at position ${i}: ${address}`);
    }
  }

  return Functions.encodeString(JSON.stringify(rankings));
} catch (error) {
  return Functions.encodeString(JSON.stringify([]));
}
