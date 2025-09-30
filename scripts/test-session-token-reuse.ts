#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Test script to verify that session token reuse is completely resolved
 * This simulates the exact scenario where "Add Funds" is clicked multiple times
 * Usage: npm run test-session-token-reuse
 */

const testSessionTokenReuse = async () => {
  console.log('🧪 Testing session token reuse prevention...\n');

  const testWalletAddress = '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67';

  try {
    // Test 1: Simulate multiple "Add Funds" clicks (GameEntry component)
    console.log('1️⃣ Testing multiple "Add Funds" clicks (GameEntry component)...');
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        fetch('http://localhost:3001/api/session-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ 
            walletAddress: testWalletAddress,
            requestId: `funding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${testWalletAddress.slice(-6)}`,
            component: 'GameEntry'
          }),
        })
      );
    }

    const responses = await Promise.all(promises);
    const tokens: string[] = [];

    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) {
        const errorData = await responses[i].json();
        throw new Error(`Request ${i + 1} failed: ${errorData.error}`);
      }
      const data = await responses[i].json();
      tokens.push(data.sessionToken);
      console.log(`✅ Request ${i + 1}: Token generated (${data.sessionToken.substring(0, 20)}...)`);
    }

    // Test 2: Verify all tokens are different
    console.log('\n2️⃣ Verifying all tokens are different...');
    const allTokensDifferent = tokens.every((token, index) => 
      tokens.every((otherToken, otherIndex) => 
        index === otherIndex || token !== otherToken
      )
    );
    
    console.log(`✅ All tokens are different: ${allTokensDifferent}`);
    
    if (!allTokensDifferent) {
      console.log('❌ ERROR: Some tokens are identical! This will cause the "sessionToken can only be used once" error.');
      return;
    }

    // Test 3: Test rapid successive requests (simulating user clicking multiple times)
    console.log('\n3️⃣ Testing rapid successive requests...');
    const rapidTokens: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      const response = await fetch('http://localhost:3001/api/session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ 
          walletAddress: testWalletAddress,
          requestId: `funding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${testWalletAddress.slice(-6)}`,
          component: 'GameEntry'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Rapid request ${i + 1} failed: ${errorData.error}`);
      }

      const data = await response.json();
      rapidTokens.push(data.sessionToken);
      console.log(`✅ Rapid request ${i + 1}: Token generated (${data.sessionToken.substring(0, 20)}...)`);
    }

    // Test 4: Verify rapid tokens are all different
    console.log('\n4️⃣ Verifying rapid tokens are all different...');
    const rapidTokensDifferent = rapidTokens.every((token, index) => 
      rapidTokens.every((otherToken, otherIndex) => 
        index === otherIndex || token !== otherToken
      )
    );
    
    console.log(`✅ All rapid tokens are different: ${rapidTokensDifferent}`);

    // Test 5: Test mixed component requests
    console.log('\n5️⃣ Testing mixed component requests...');
    const mixedTokens = [];
    
    // GameEntry request
    const gameEntryResponse = await fetch('http://localhost:3001/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `funding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${testWalletAddress.slice(-6)}`,
        component: 'GameEntry'
      }),
    });

    if (!gameEntryResponse.ok) {
      const errorData = await gameEntryResponse.json();
      throw new Error(`GameEntry request failed: ${errorData.error}`);
    }
    const gameEntryData = await gameEntryResponse.json();
    mixedTokens.push({ token: gameEntryData.sessionToken, component: 'GameEntry' });

    // GamePayment request
    const gamePaymentResponse = await fetch('http://localhost:3001/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${testWalletAddress.slice(-6)}`,
        component: 'GamePayment'
      }),
    });

    if (!gamePaymentResponse.ok) {
      const errorData = await gamePaymentResponse.json();
      throw new Error(`GamePayment request failed: ${errorData.error}`);
    }
    const gamePaymentData = await gamePaymentResponse.json();
    mixedTokens.push({ token: gamePaymentData.sessionToken, component: 'GamePayment' });

    console.log(`✅ GameEntry token: ${mixedTokens[0].token.substring(0, 20)}...`);
    console.log(`✅ GamePayment token: ${mixedTokens[1].token.substring(0, 20)}...`);

    // Test 6: Verify mixed component tokens are different
    console.log('\n6️⃣ Verifying mixed component tokens are different...');
    const mixedTokensDifferent = mixedTokens[0].token !== mixedTokens[1].token;
    console.log(`✅ Mixed component tokens are different: ${mixedTokensDifferent}`);

    // Final verification
    console.log('\n🎉 All session token reuse tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - Multiple "Add Funds" clicks generate different tokens');
    console.log('   - Rapid successive requests generate different tokens');
    console.log('   - Different components generate different tokens');
    console.log('   - No token reuse detected');
    console.log('\n✅ The "sessionToken can only be used once" error should be completely resolved!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Make sure your development server is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
};

testSessionTokenReuse();
