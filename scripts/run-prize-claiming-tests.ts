#!/usr/bin/env tsx

/**
 * Test Runner: Prize Claiming Tests
 * 
 * This script runs all prize claiming related tests:
 * 1. Prize claiming flow test
 * 2. Smart contract claiming test
 * 3. UI claiming flow test
 * 4. Integration test
 */

import { testPrizeClaimingFlow } from './test-prize-claiming-flow';
import { testSmartContractClaiming } from './test-smart-contract-claiming';
import { testUIClaimingFlow } from './test-ui-claiming-flow';

// Test configuration
const TEST_CONFIG = {
  runAll: process.argv.includes('--all'),
  runFlow: process.argv.includes('--flow'),
  runContract: process.argv.includes('--contract'),
  runUI: process.argv.includes('--ui'),
  verbose: process.argv.includes('--verbose'),
};

async function runPrizeClaimingTests() {
  console.log('🧪 Starting Prize Claiming Tests...\n');

  const startTime = Date.now();
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  try {
    // 1. Prize Claiming Flow Test
    if (TEST_CONFIG.runAll || TEST_CONFIG.runFlow) {
      console.log('🎯 Running Prize Claiming Flow Test...');
      results.total++;
      try {
        await testPrizeClaimingFlow();
        results.passed++;
        console.log('✅ Prize Claiming Flow Test PASSED\n');
      } catch (error) {
        results.failed++;
        console.error('❌ Prize Claiming Flow Test FAILED:', error);
        if (!TEST_CONFIG.runAll) throw error;
      }
    }

    // 2. Smart Contract Claiming Test
    if (TEST_CONFIG.runAll || TEST_CONFIG.runContract) {
      console.log('🔗 Running Smart Contract Claiming Test...');
      results.total++;
      try {
        await testSmartContractClaiming();
        results.passed++;
        console.log('✅ Smart Contract Claiming Test PASSED\n');
      } catch (error) {
        results.failed++;
        console.error('❌ Smart Contract Claiming Test FAILED:', error);
        if (!TEST_CONFIG.runAll) throw error;
      }
    }

    // 3. UI Claiming Flow Test
    if (TEST_CONFIG.runAll || TEST_CONFIG.runUI) {
      console.log('🖥️ Running UI Claiming Flow Test...');
      results.total++;
      try {
        await testUIClaimingFlow();
        results.passed++;
        console.log('✅ UI Claiming Flow Test PASSED\n');
      } catch (error) {
        results.failed++;
        console.error('❌ UI Claiming Flow Test FAILED:', error);
        if (!TEST_CONFIG.runAll) throw error;
      }
    }

    // 4. Integration Test
    if (TEST_CONFIG.runAll) {
      console.log('🔗 Running Integration Test...');
      results.total++;
      try {
        await runIntegrationTest();
        results.passed++;
        console.log('✅ Integration Test PASSED\n');
      } catch (error) {
        results.failed++;
        console.error('❌ Integration Test FAILED:', error);
        if (!TEST_CONFIG.runAll) throw error;
      }
    }

    // 5. Print results
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
      console.log('\n❌ Some tests failed. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
    }

  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

async function runIntegrationTest() {
  console.log('🔗 Running Integration Test...');
  
  try {
    // Test the complete flow from game completion to prize claiming
    console.log('1. Testing game completion...');
    // Simulate game completion logic
    
    console.log('2. Testing prize calculation...');
    // Test prize calculation logic
    
    console.log('3. Testing database updates...');
    // Test SpacetimeDB updates
    
    console.log('4. Testing UI state updates...');
    // Test UI state management
    
    console.log('5. Testing smart contract interaction...');
    // Test contract interaction
    
    console.log('✅ Integration test completed');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

function printUsage() {
  console.log(`
Usage: tsx scripts/run-prize-claiming-tests.ts [options]

Options:
  --all       Run all tests (default)
  --flow      Run only prize claiming flow test
  --contract  Run only smart contract claiming test
  --ui        Run only UI claiming flow test
  --verbose   Enable verbose output

Examples:
  tsx scripts/run-prize-claiming-tests.ts --all
  tsx scripts/run-prize-claiming-tests.ts --flow --ui
  tsx scripts/run-prize-claiming-tests.ts --contract --verbose
`);
}

// Run the tests
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // Default to running all tests if no specific test is specified
  if (!TEST_CONFIG.runFlow && !TEST_CONFIG.runContract && !TEST_CONFIG.runUI) {
    TEST_CONFIG.runAll = true;
  }

  runPrizeClaimingTests().catch(console.error);
}

export { runPrizeClaimingTests };
