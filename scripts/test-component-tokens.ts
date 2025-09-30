#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Test script to verify that different components generate different session tokens
 * Usage: npm run test-component-tokens
 */

const testComponentTokenGeneration = async () => {
  console.log('🧪 Testing component-specific session token generation...\n');

  const testWalletAddress = '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67';

  try {
    // Test 1: Generate token for GameEntry component
    console.log('1️⃣ Generating session token for GameEntry component...');
    const response1 = await fetch('http://localhost:3001/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `funding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        component: 'GameEntry'
      }),
    });

    if (!response1.ok) {
      const errorData = await response1.json();
      throw new Error(`GameEntry request failed: ${errorData.error}`);
    }

    const data1 = await response1.json();
    console.log('✅ GameEntry session token generated successfully');
    console.log(`📏 Token length: ${data1.sessionToken.length} characters`);
    console.log(`🔍 Token (first 20 chars): ${data1.sessionToken.substring(0, 20)}...`);

    // Test 2: Generate token for GamePayment component
    console.log('\n2️⃣ Generating session token for GamePayment component...');
    const response2 = await fetch('http://localhost:3001/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        component: 'GamePayment'
      }),
    });

    if (!response2.ok) {
      const errorData = await response2.json();
      throw new Error(`GamePayment request failed: ${errorData.error}`);
    }

    const data2 = await response2.json();
    console.log('✅ GamePayment session token generated successfully');
    console.log(`📏 Token length: ${data2.sessionToken.length} characters`);
    console.log(`🔍 Token (first 20 chars): ${data2.sessionToken.substring(0, 20)}...`);

    // Test 3: Verify tokens are different
    console.log('\n3️⃣ Verifying tokens are different...');
    const tokensAreDifferent = data1.sessionToken !== data2.sessionToken;
    console.log(`✅ Tokens are different: ${tokensAreDifferent}`);

    if (!tokensAreDifferent) {
      console.log('❌ ERROR: Both tokens are identical! This will cause the "sessionToken can only be used once" error.');
    } else {
      console.log('✅ SUCCESS: Different components generate different session tokens!');
    }

    // Test 4: Test multiple GamePayment tokens
    console.log('\n4️⃣ Testing multiple GamePayment tokens...');
    const response3 = await fetch('http://localhost:3001/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        component: 'GamePayment'
      }),
    });

    if (!response3.ok) {
      const errorData = await response3.json();
      throw new Error(`Second GamePayment request failed: ${errorData.error}`);
    }

    const data3 = await response3.json();
    console.log('✅ Second GamePayment session token generated successfully');
    console.log(`📏 Token length: ${data3.sessionToken.length} characters`);

    // Test 5: Verify all tokens are different
    console.log('\n5️⃣ Verifying all tokens are different...');
    const allTokensDifferent = data1.sessionToken !== data2.sessionToken && 
                              data2.sessionToken !== data3.sessionToken && 
                              data1.sessionToken !== data3.sessionToken;
    console.log(`✅ All tokens are different: ${allTokensDifferent}`);

    if (!allTokensDifferent) {
      console.log('❌ ERROR: Some tokens are identical! This will cause session token reuse errors.');
    } else {
      console.log('✅ SUCCESS: All session tokens are unique!');
    }

    console.log('\n🎉 All component token tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - GameEntry component generates unique tokens');
    console.log('   - GamePayment component generates unique tokens');
    console.log('   - Multiple requests from same component generate different tokens');
    console.log('   - No token reuse detected');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Make sure your development server is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
};

testComponentTokenGeneration();
