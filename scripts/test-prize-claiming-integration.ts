#!/usr/bin/env tsx

/**
 * Integration Test: Prize Claiming
 * 
 * This script runs all prize claiming tests in sequence:
 * 1. Prize claiming flow test
 * 2. Smart contract claiming test
 * 3. UI claiming flow test
 * 4. Integration verification
 */

import { testPrizeClaiming } from './test-prize-claiming-simple';
import { testSmartContractClaiming } from './test-smart-contract-claiming-simple';
import { testUIClaiming } from './test-ui-claiming-simple';

// Test configuration
const TEST_SUITES = [
  {
    name: 'Prize Claiming Flow',
    test: testPrizeClaiming,
    description: 'Tests the complete prize claiming flow from game completion to prize distribution'
  },
  {
    name: 'Smart Contract Claiming',
    test: testSmartContractClaiming,
    description: 'Tests the smart contract claiming functionality and gasless transactions'
  },
  {
    name: 'UI Claiming Flow',
    test: testUIClaiming,
    description: 'Tests the UI claiming flow and component interactions'
  }
];

async function runIntegrationTests() {
  console.log('🧪 Starting Prize Claiming Integration Tests...\n');

  const startTime = Date.now();
  const results = {
    passed: 0,
    failed: 0,
    total: TEST_SUITES.length,
    details: [] as Array<{ name: string; status: 'PASSED' | 'FAILED'; duration: number; error?: string }>
  };

  // Run each test suite
  for (const suite of TEST_SUITES) {
    console.log(`\n📋 Running ${suite.name}...`);
    console.log(`📝 ${suite.description}\n`);
    
    const suiteStartTime = Date.now();
    
    try {
      const success = await suite.test();
      const duration = Date.now() - suiteStartTime;
      
      if (success) {
        results.passed++;
        results.details.push({
          name: suite.name,
          status: 'PASSED',
          duration
        });
        console.log(`✅ ${suite.name} PASSED (${duration}ms)`);
      } else {
        results.failed++;
        results.details.push({
          name: suite.name,
          status: 'FAILED',
          duration,
          error: 'Test returned false'
        });
        console.log(`❌ ${suite.name} FAILED (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - suiteStartTime;
      results.failed++;
      results.details.push({
        name: suite.name,
        status: 'FAILED',
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`❌ ${suite.name} FAILED (${duration}ms): ${error}`);
    }
  }

  // Calculate total duration
  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${totalDuration}ms`);

  // Print detailed results
  console.log('\n📋 Detailed Results:');
  console.log('===================');
  for (const detail of results.details) {
    const status = detail.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${detail.name} (${detail.duration}ms)`);
    if (detail.error) {
      console.log(`   Error: ${detail.error}`);
    }
  }

  // Print recommendations
  console.log('\n💡 Recommendations:');
  console.log('===================');
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! The prize claiming feature is working correctly.');
    console.log('✅ Ready for production deployment.');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
    console.log('🔧 Fix the failing tests before deploying to production.');
  }

  // Print next steps
  console.log('\n🚀 Next Steps:');
  console.log('==============');
  console.log('1. Review test results and fix any failures');
  console.log('2. Run tests in production environment');
  console.log('3. Test with real wallet connections');
  console.log('4. Verify gasless transactions work correctly');
  console.log('5. Test prize claiming with real USDC transfers');

  return results.failed === 0;
}

// Run the integration tests
runIntegrationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Integration test runner error:', error);
    process.exit(1);
  });

export { runIntegrationTests };
