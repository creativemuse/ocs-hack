#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateAndLogJWT } from '../lib/cdp/jwt-generator';

/**
 * Script to generate JWT for CDP API authentication
 * Usage: npm run generate-jwt
 * 
 * This will output the JWT token and export command
 * The JWT expires in 2 minutes, so you'll need to regenerate it frequently
 */

const main = () => {
  try {
    console.log('🔐 Generating JWT for CDP API authentication...\n');
    
    const token = generateAndLogJWT();
    
    console.log('\n✅ JWT generated successfully!');
    console.log('📝 Copy the export command above to set your JWT environment variable');
    console.log('⏰ Remember: JWT expires in 2 minutes, regenerate as needed');
    
    // Also write to a file for easy access
    const jwtFile = path.join(process.cwd(), '.env.jwt');
    
    fs.writeFileSync(jwtFile, `JWT=${token}\n`);
    console.log(`💾 JWT also saved to: ${jwtFile}`);
    
  } catch (error) {
    console.error('❌ Error generating JWT:', error);
    console.log('\n🔧 Make sure you have the following environment variables set:');
    console.log('   - KEY_NAME');
    console.log('   - KEY_SECRET');
    console.log('   - REQUEST_METHOD');
    console.log('   - REQUEST_HOST');
    console.log('   - REQUEST_PATH');
    process.exit(1);
  }
};

main();
