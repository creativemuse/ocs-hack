/**
 * Run All SpacetimeDB Tests
 * 
 * Executes all wallet identity system tests in sequence
 * 
 * Run: npx ts-node scripts/run-all-spacetime-tests.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const tests = [
  {
    name: 'Wallet Identity Flow',
    script: 'scripts/test-wallet-identity-flow.ts',
    description: 'Tests paid player flow with wallet-based identity',
  },
  {
    name: 'Trial Player Flow',
    script: 'scripts/test-trial-player-flow.ts',
    description: 'Tests trial/guest player flow',
  },
  {
    name: 'Leaderboard Earnings',
    script: 'scripts/test-leaderboard-earnings.ts',
    description: 'Tests leaderboard sorting by USDC earnings',
  },
  {
    name: 'Cross-Device Persistence',
    script: 'scripts/test-cross-device-persistence.ts',
    description: 'Tests stats persistence across devices',
  },
];

async function runAllTests() {
  console.log('🧪 Running All SpacetimeDB Tests');
  console.log('═'.repeat(70));
  console.log();

  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const test of tests) {
    console.log(`\n▶️  Running: ${test.name}`);
    console.log(`   ${test.description}`);
    console.log('─'.repeat(70));
    
    try {
      const { stdout, stderr } = await execAsync(`npx tsx ${test.script}`);
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('ExperimentalWarning')) console.error(stderr);
      
      console.log(`✅ ${test.name} - PASSED`);
      passed++;
      results.push({ name: test.name, success: true });
      
    } catch (error: any) {
      console.error(`❌ ${test.name} - FAILED`);
      console.error(error.stdout || error.message);
      failed++;
      results.push({ 
        name: test.name, 
        success: false, 
        error: error.message 
      });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log();

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log();
  console.log(`Total: ${tests.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

