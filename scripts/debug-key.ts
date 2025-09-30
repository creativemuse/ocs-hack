#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const keySecret = process.env.KEY_SECRET!;

console.log('🔍 Debugging CDP Key Format:');
console.log('Key length:', keySecret.length);
console.log('Key type:', typeof keySecret);
console.log('Key starts with:', keySecret.substring(0, 20));
console.log('Key ends with:', keySecret.substring(keySecret.length - 20));

// Check if it's base64
try {
  const decoded = Buffer.from(keySecret, 'base64');
  console.log('✅ Key is valid base64');
  console.log('Decoded length:', decoded.length);
  console.log('Decoded starts with:', decoded.toString('hex').substring(0, 20));
} catch (error) {
  console.log('❌ Key is not valid base64');
}

// Try different PEM formats
console.log('\n🔧 Trying different PEM formats:');

// Format 1: Standard PEM
const pem1 = `-----BEGIN PRIVATE KEY-----\n${keySecret}\n-----END PRIVATE KEY-----`;
console.log('PEM Format 1:', pem1.substring(0, 50) + '...');

// Format 2: EC Private Key
const pem2 = `-----BEGIN EC PRIVATE KEY-----\n${keySecret}\n-----END EC PRIVATE KEY-----`;
console.log('PEM Format 2:', pem2.substring(0, 50) + '...');

// Format 3: PKCS#8
const pem3 = `-----BEGIN PRIVATE KEY-----\n${keySecret.replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----`;
console.log('PEM Format 3:', pem3.substring(0, 50) + '...');
