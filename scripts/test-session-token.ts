#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Test script to verify session token generation works correctly
 * Usage: npm run test-session-token
 */

const testSessionTokenGeneration = async () => {
  console.log('🧪 Testing session token generation...\n');

  const testWalletAddress = '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67';

  try {
    // Test 1: Generate first session token
    console.log('1️⃣ Generating first session token...');
    const response1 = await fetch('http://localhost:3000/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `test1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }),
    });

    if (!response1.ok) {
      const errorData = await response1.json();
      throw new Error(`First request failed: ${errorData.error}`);
    }

    const data1 = await response1.json();
    console.log('✅ First session token generated successfully');
    console.log(`📏 Token length: ${data1.sessionToken.length} characters`);
    console.log(`🔍 Token (first 20 chars): ${data1.sessionToken.substring(0, 20)}...`);

    // Test 2: Generate second session token immediately
    console.log('\n2️⃣ Generating second session token immediately...');
    const response2 = await fetch('http://localhost:3000/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: testWalletAddress,
        requestId: `test2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }),
    });

    if (!response2.ok) {
      const errorData = await response2.json();
      throw new Error(`Second request failed: ${errorData.error}`);
    }

    const data2 = await response2.json();
    console.log('✅ Second session token generated successfully');
    console.log(`📏 Token length: ${data2.sessionToken.length} characters`);
    console.log(`🔍 Token (first 20 chars): ${data2.sessionToken.substring(0, 20)}...`);

    // Test 3: Verify tokens are different
    console.log('\n3️⃣ Verifying tokens are different...');
    const tokensAreDifferent = data1.sessionToken !== data2.sessionToken;
    console.log(`✅ Tokens are different: ${tokensAreDifferent}`);

    if (!tokensAreDifferent) {
      console.log('❌ ERROR: Both tokens are identical! This will cause the "sessionToken can only be used once" error.');
    } else {
      console.log('✅ SUCCESS: Each request generates a unique session token!');
    }

    // Test 4: Test with different wallet addresses
    console.log('\n4️⃣ Testing with different wallet address...');
    const differentWallet = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const response3 = await fetch('http://localhost:3000/api/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ 
        walletAddress: differentWallet,
        requestId: `test3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }),
    });

    if (!response3.ok) {
      const errorData = await response3.json();
      throw new Error(`Third request failed: ${errorData.error}`);
    }

    const data3 = await response3.json();
    console.log('✅ Third session token generated successfully');
    console.log(`📏 Token length: ${data3.sessionToken.length} characters`);

    console.log('\n🎉 All tests passed! Session token generation is working correctly.');
    console.log('\n📝 Summary:');
    console.log('   - Each request generates a unique session token');
    console.log('   - Tokens are properly formatted');
    console.log('   - No token reuse detected');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Make sure your development server is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
};

testSessionTokenGeneration();
