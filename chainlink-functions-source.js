/**
 * Chainlink Functions Source Code for TriviaGame Rankings
 * 
 * This JavaScript code runs on Chainlink DON nodes to fetch game rankings
 * from your backend API and return them in the format expected by the contract.
 * 
 * The DON nodes will reach consensus on the rankings before submitting to the contract.
 */

// Get the gameId from the function arguments
const gameId = args[0];

// Validate gameId
if (!gameId || isNaN(parseInt(gameId))) {
  throw new Error(`Invalid gameId: ${gameId}`);
}

// Construct the API URL
// Note: Replace with your actual domain
const apiUrl = `https://beatme.creativeplatform.xyz/api/chainlink/game-rankings/${gameId}`;

console.log(`Fetching rankings for game ${gameId} from ${apiUrl}`);

try {
  // Make HTTP request to your API
  const response = await Functions.makeHttpRequest({
    url: apiUrl,
    method: "GET",
    timeout: 9000, // 9 second timeout
    headers: {
      'User-Agent': 'Chainlink-Functions-DON/1.0',
      'Accept': 'application/json'
    }
  });

  console.log(`API Response Status: ${response.statusCode}`);
  console.log(`API Response Data:`, response.data);

  // Check for HTTP errors
  if (response.error) {
    throw new Error(`API Error: ${response.error}`);
  }

  // Check for HTTP status errors
  if (response.statusCode !== 200) {
    throw new Error(`HTTP Error: ${response.statusCode} - ${response.data?.error || 'Unknown error'}`);
  }

  // Validate response structure
  if (!response.data) {
    throw new Error('No data received from API');
  }

  const { gameId: returnedGameId, rankings, timestamp } = response.data;

  // Validate response format
  if (!Array.isArray(rankings)) {
    throw new Error('Invalid response format: rankings must be an array');
  }

  // Validate gameId matches
  if (returnedGameId !== parseInt(gameId)) {
    throw new Error(`GameId mismatch: expected ${gameId}, got ${returnedGameId}`);
  }

  // Validate rankings are wallet addresses (basic format check)
  for (let i = 0; i < rankings.length; i++) {
    const address = rankings[i];
    if (typeof address !== 'string' || address.length < 10) {
      throw new Error(`Invalid address at position ${i}: ${address}`);
    }
  }

  console.log(`Successfully fetched ${rankings.length} rankings for game ${gameId}`);
  console.log(`Rankings:`, rankings);

  // Return the rankings as encoded string for the contract
  // The contract will decode this back to an address array
  return Functions.encodeString(JSON.stringify(rankings));

} catch (error) {
  console.error(`Error fetching rankings for game ${gameId}:`, error);
  
  // Return empty array on error to allow fallback oracle to handle
  // This prevents the entire request from failing
  return Functions.encodeString(JSON.stringify([]));
}
