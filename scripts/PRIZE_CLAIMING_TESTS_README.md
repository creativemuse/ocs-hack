# Prize Claiming Tests

This directory contains comprehensive test scripts for the prize claiming functionality in the Beat Me trivia game.

## Test Scripts Overview

### 1. `test-prize-claiming-flow.ts`
Tests the complete prize claiming flow from game completion to prize distribution.

**What it tests:**
- Game completion with high score
- Prize calculation and distribution
- Database updates in SpacetimeDB
- Player earnings tracking
- Prize claiming data preparation

### 2. `test-smart-contract-claiming.ts`
Tests the smart contract claiming functionality.

**What it tests:**
- Contract deployment verification
- Prize claiming function execution
- Double-claiming prevention
- Gasless transaction handling
- USDC transfer verification

### 3. `test-ui-claiming-flow.ts`
Tests the UI claiming flow and component interactions.

**What it tests:**
- HighScoreDisplay component rendering
- Prize calculation display
- Claiming button states
- Transaction status updates
- Error handling scenarios

### 4. `run-prize-claiming-tests.ts`
Test runner that executes all prize claiming tests.

**Features:**
- Run all tests or specific test suites
- Detailed test results and reporting
- Integration testing
- Performance metrics

## Running the Tests

### Prerequisites

1. **Environment Setup:**
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Required Environment Variables:**
   ```bash
   SPACETIME_URI=http://localhost:3000
   MODULE_NAME=beat-me
   CONTRACT_ADDRESS=0x...
   PRIVATE_KEY=0x...
   BASE_RPC_URL=https://mainnet.base.org
   ```

3. **SpacetimeDB Setup:**
   ```bash
   # Start SpacetimeDB server
   spacetime start
   
   # Publish the module
   spacetime publish --project-path spacetime-module/beat-me beat-me
   ```

### Running Individual Tests

```bash
# Run prize claiming flow test
tsx scripts/test-prize-claiming-flow.ts

# Run smart contract claiming test
tsx scripts/test-smart-contract-claiming.ts

# Run UI claiming flow test
tsx scripts/test-ui-claiming-flow.ts
```

### Running All Tests

```bash
# Run all tests
tsx scripts/run-prize-claiming-tests.ts --all

# Run specific test suites
tsx scripts/run-prize-claiming-tests.ts --flow --ui

# Run with verbose output
tsx scripts/run-prize-claiming-tests.ts --all --verbose
```

### Test Options

- `--all`: Run all test suites
- `--flow`: Run only prize claiming flow test
- `--contract`: Run only smart contract claiming test
- `--ui`: Run only UI claiming flow test
- `--verbose`: Enable detailed output
- `--help`: Show usage information

## Test Configuration

The test configuration is stored in `test-config.json` and includes:

- **SpacetimeDB Configuration:** URI and module name
- **Contract Configuration:** Address, RPC URL, USDC address
- **Test Wallets:** Test wallet addresses for different scenarios
- **Test Scores:** Different score ranges for testing
- **Expected Prizes:** Expected prize amounts for different scores

## Test Scenarios

### 1. Prize Claiming Flow Test
- **High Score Scenario:** Score 850+ → $0.10 USDC prize
- **Medium Score Scenario:** Score 700-799 → $0.05 USDC prize
- **Low Score Scenario:** Score 600-699 → $0.02 USDC prize
- **No Prize Scenario:** Score <600 → $0.00 USDC prize

### 2. Smart Contract Claiming Test
- **Successful Claiming:** Player claims prize successfully
- **Double-Claiming Prevention:** Player cannot claim twice
- **Gasless Transactions:** Transactions use paymaster
- **USDC Transfer:** Prize is transferred to player's wallet

### 3. UI Claiming Flow Test
- **Component Rendering:** HighScoreDisplay shows correct data
- **Button States:** Claiming button enabled/disabled correctly
- **Status Updates:** Transaction status updates properly
- **Error Handling:** Errors are handled gracefully

## Expected Test Results

### Successful Test Run
```
🧪 Starting Prize Claiming Tests...

🎯 Running Prize Claiming Flow Test...
✅ Prize Claiming Flow Test PASSED

🔗 Running Smart Contract Claiming Test...
✅ Smart Contract Claiming Test PASSED

🖥️ Running UI Claiming Flow Test...
✅ UI Claiming Flow Test PASSED

🔗 Running Integration Test...
✅ Integration Test PASSED

📊 Test Results Summary:
Total Tests: 4
Passed: 4
Failed: 0
Duration: 2500ms
Success Rate: 100.0%

🎉 All tests passed successfully!
```

### Failed Test Run
```
❌ Prize Claiming Flow Test FAILED: Error: Player not found
❌ Smart Contract Claiming Test FAILED: Error: Contract not deployed
❌ UI Claiming Flow Test FAILED: Error: Component not rendering

📊 Test Results Summary:
Total Tests: 3
Passed: 0
Failed: 3
Duration: 1500ms
Success Rate: 0.0%

❌ Some tests failed. Check the logs above for details.
```

## Troubleshooting

### Common Issues

1. **SpacetimeDB Connection Failed:**
   - Ensure SpacetimeDB server is running
   - Check SPACETIME_URI environment variable
   - Verify module is published

2. **Smart Contract Test Failed:**
   - Ensure contract is deployed
   - Check CONTRACT_ADDRESS environment variable
   - Verify RPC URL is accessible

3. **UI Test Failed:**
   - Ensure all components are properly imported
   - Check for missing dependencies
   - Verify test data is correct

### Debug Mode

Run tests with verbose output to see detailed logs:

```bash
tsx scripts/run-prize-claiming-tests.ts --all --verbose
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add comprehensive error handling
3. Include detailed logging
4. Update this README with new test information
5. Ensure tests are deterministic and repeatable

## Test Data

The tests use the following test data:

- **Test Wallet:** `0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`
- **Test Scores:** 600, 700, 800, 900
- **Expected Prizes:** $0.02, $0.05, $0.10, $0.10
- **Test Session ID:** `test-session-{timestamp}`

## Performance

- **Test Duration:** ~2-5 seconds per test suite
- **Memory Usage:** ~50MB per test
- **Network Calls:** Minimal (only for contract interactions)
- **Database Operations:** Lightweight (test data only)

## Security

- **Private Keys:** Use test private keys only
- **Test Data:** Automatically cleaned up after tests
- **Network Access:** Limited to required endpoints only
- **Data Isolation:** Each test uses unique test data
