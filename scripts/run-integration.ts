#!/usr/bin/env tsx

/**
 * Run TriviaBattlev4 Integration
 * 
 * This script helps you run the complete integration setup and testing.
 */

import { configureContract, testContractConnection } from './configure-chainlink-functions';
import { testContractIntegration, checkUpkeepStatus } from './test-integration';

async function main() {
  console.log('🚀 TriviaBattlev4 Integration Runner\n');
  
  try {
    // Step 1: Test contract connection
    console.log('📡 Step 1: Testing Contract Connection...');
    const connected = await testContractConnection();
    if (!connected) {
      console.log('❌ Contract connection failed. Please check your configuration.');
      return;
    }
    console.log('✅ Contract connection successful!\n');

    // Step 2: Configure Chainlink Functions
    console.log('⚙️  Step 2: Configuring Chainlink Functions...');
    try {
      await configureContract();
      console.log('✅ Chainlink Functions configured successfully!\n');
    } catch (error) {
      console.log('⚠️  Chainlink Functions configuration failed:', error instanceof Error ? error.message : String(error));
      console.log('   This might be because it\'s already configured or missing subscription ID.\n');
    }

    // Step 3: Test integration
    console.log('🧪 Step 3: Testing Integration...');
    try {
      await testContractIntegration();
      console.log('✅ Integration test completed!\n');
    } catch (error) {
      console.log('⚠️  Integration test failed:', error instanceof Error ? error.message : String(error));
      console.log('   This might be due to insufficient USDC balance or other issues.\n');
    }

    // Step 4: Check upkeep status
    console.log('🔍 Step 4: Checking Upkeep Status...');
    await checkUpkeepStatus();

    console.log('\n🎉 Integration setup complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Monitor your Chainlink Functions subscription');
    console.log('2. Check your upkeep status in Chainlink Automation dashboard');
    console.log('3. Test creating a game through your UI');
    console.log('4. Have players enter the game');
    console.log('5. Monitor the complete flow');

  } catch (error) {
    console.error('💥 Integration runner failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

export { main };
