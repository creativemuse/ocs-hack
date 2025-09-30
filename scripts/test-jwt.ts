#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createCDPJWTGenerator, generateAndLogJWT } from '../lib/cdp/jwt-generator';

/**
 * Test script to verify JWT generation works correctly
 * Usage: npm run test-jwt
 */

const testJWTGeneration = async () => {
  console.log('🧪 Testing JWT generation for CDP API...\n');

  try {
    // Test 1: Basic JWT generation
    console.log('1️⃣ Testing basic JWT generation...');
    const generator = createCDPJWTGenerator();
    const token = generator.generateJWT();
    
    console.log('✅ JWT generated successfully');
    console.log(`📏 Token length: ${token.length} characters`);
    console.log(`⏰ Expires in: ${generator.getJWTTimeRemaining(token)} seconds`);
    console.log(`🔍 Is expired: ${generator.isJWTExpired(token)}`);

    // Test 2: JWT export format
    console.log('\n2️⃣ Testing JWT export format...');
    const exportCommand = generator.generateJWTExport();
    console.log('✅ Export command generated:');
    console.log(exportCommand);

    // Test 3: Multiple token generation (should be different)
    console.log('\n3️⃣ Testing multiple token generation...');
    const token1 = generator.generateJWT();
    const token2 = generator.generateJWT();
    const tokensAreDifferent = token1 !== token2;
    
    console.log(`✅ Tokens are different: ${tokensAreDifferent}`);
    console.log(`📏 Token 1 length: ${token1.length}`);
    console.log(`📏 Token 2 length: ${token2.length}`);

    // Test 4: Token structure validation
    console.log('\n4️⃣ Testing token structure...');
    const parts = token.split('.');
    const hasThreeParts = parts.length === 3;
    const header = parts[0];
    const payload = parts[1];
    const signature = parts[2];
    
    console.log(`✅ Has 3 parts: ${hasThreeParts}`);
    console.log(`📏 Header length: ${header.length}`);
    console.log(`📏 Payload length: ${payload.length}`);
    console.log(`📏 Signature length: ${signature.length}`);

    // Test 5: Full generation with logging
    console.log('\n5️⃣ Testing full generation with logging...');
    console.log('--- Full JWT Generation ---');
    generateAndLogJWT();
    console.log('--- End Full Generation ---');

    console.log('\n🎉 All tests passed! JWT generation is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Set up your environment variables in .env.local');
    console.log('   2. Run: npm run generate-jwt');
    console.log('   3. Use the JWT in your CDP API calls');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Make sure you have the following environment variables set:');
    console.log('   - KEY_NAME');
    console.log('   - KEY_SECRET');
    console.log('   - REQUEST_METHOD');
    console.log('   - REQUEST_HOST');
    console.log('   - REQUEST_PATH');
    process.exit(1);
  }
};

testJWTGeneration();
