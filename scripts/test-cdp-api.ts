#!/usr/bin/env tsx

/**
 * Test script for CDP Onramp API
 * 
 * This script demonstrates how to use the CDP Onramp API client
 * to generate session tokens and get buy quotes.
 * 
 * Usage:
 *   npm run test:cdp-api
 *   or
 *   npx tsx scripts/test-cdp-api.ts
 */

import { cdpOnrampClient, createSessionTokenForWallet, getBuyQuote, examples } from '../lib/apis/cdp-onramp';

async function main() {
  console.log('🚀 Testing CDP Onramp API...\n');

  // Test wallet address
  const testWallet = '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67';
  const clientIp = '8.8.8.8';

  try {
    // Test 1: Generate session token
    console.log('📝 Test 1: Generating session token...');
    const sessionToken = await createSessionTokenForWallet(testWallet, clientIp, 'TestScript');
    console.log('✅ Session token generated successfully');
    console.log(`   Token (first 20 chars): ${sessionToken.substring(0, 20)}...\n`);

    // Test 2: Get buy quote
    console.log('💰 Test 2: Getting buy quote...');
    const buyQuote = await getBuyQuote(
      testWallet,
      '10.00', // $10 USD
      'USD',
      'USDC',
      'base',
      'US',
      clientIp
    );
    console.log('✅ Buy quote generated successfully');
    console.log(`   Quote ID: ${buyQuote.quoteId || 'N/A'}`);
    console.log(`   Purchase Amount: ${buyQuote.purchaseAmount || 'N/A'} USDC`);
    console.log(`   Payment Total: ${buyQuote.paymentTotal || 'N/A'} USD`);
    console.log(`   Onramp URL: ${buyQuote.onrampUrl ? 'Generated' : 'Not provided'}\n`);

    // Test 3: Complete flow example
    console.log('🔄 Test 3: Complete flow example...');
    const completeResult = await examples.completeFlowExample();
    console.log('✅ Complete flow executed successfully\n');

    // Test 4: Custom request example
    console.log('🎯 Test 4: Custom request example...');
    const customSessionRequest = {
      clientIp,
      addresses: [
        {
          address: testWallet,
          blockchains: ['base', 'ethereum']
        }
      ],
      assets: ['USDC', 'ETH'],
      requestId: `custom_${Date.now()}`,
      component: 'CustomTest',
      sessionId: `custom_session_${Date.now()}`
    };

    const customSessionResponse = await cdpOnrampClient.getSessionToken(customSessionRequest);
    console.log('✅ Custom session token generated');
    console.log(`   Token (first 20 chars): ${customSessionResponse.token.substring(0, 20)}...\n`);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Check for common error patterns
      if (error.message.includes('No valid CDP API credentials')) {
        console.error('\n💡 Solution: Make sure your environment variables are set:');
        console.error('   - CDP_API_KEY_NAME');
        console.error('   - CDP_API_KEY_PRIVATE_KEY');
        console.error('   - CDP_PROJECT_ID');
        console.error('   Or legacy credentials:');
        console.error('   - CDP_API_KEY');
        console.error('   - CDP_API_SECRET');
      }
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('\n💡 Solution: Check your CDP API credentials and permissions');
      }
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        console.error('\n💡 Solution: Check if your IP is whitelisted and your project has the correct permissions');
      }
    }
    
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
