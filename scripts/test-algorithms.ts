#!/usr/bin/env ts-node

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import jwt from 'jsonwebtoken';
import { createSign } from 'crypto';

const keySecret = process.env.KEY_SECRET!;
const keyName = process.env.KEY_NAME!;

console.log('🧪 Testing different JWT algorithms with your CDP key...\n');

// Test different key formats
const keyFormats = [
  {
    name: 'Raw base64',
    key: keySecret
  },
  {
    name: 'PEM Private Key',
    key: `-----BEGIN PRIVATE KEY-----\n${keySecret}\n-----END PRIVATE KEY-----`
  },
  {
    name: 'EC Private Key',
    key: `-----BEGIN EC PRIVATE KEY-----\n${keySecret}\n-----END EC PRIVATE KEY-----`
  },
  {
    name: 'PKCS#8 with line breaks',
    key: `-----BEGIN PRIVATE KEY-----\n${keySecret.replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----`
  }
];

const algorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'ES256'];

const payload = {
  iss: 'cdp',
  nbf: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 120,
  sub: keyName,
  uri: 'POST api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets'
};

for (const format of keyFormats) {
  console.log(`\n🔧 Testing format: ${format.name}`);
  
  for (const algorithm of algorithms) {
    try {
      const token = jwt.sign(payload, format.key, { algorithm: algorithm as jwt.Algorithm });
      console.log(`  ✅ ${algorithm}: SUCCESS (${token.length} chars)`);
    } catch (error) {
      console.log(`  ❌ ${algorithm}: ${(error as Error).message}`);
    }
  }
}

// Test with Node.js crypto module directly
console.log('\n🔧 Testing with Node.js crypto module...');
try {
  const privateKey = Buffer.from(keySecret, 'base64');
  const sign = createSign('SHA256');
  sign.update(JSON.stringify(payload));
  const signature = sign.sign(privateKey, 'base64');
  console.log(`  ✅ Direct crypto: SUCCESS (${signature.length} chars)`);
} catch (error) {
  console.log(`  ❌ Direct crypto: ${(error as Error).message}`);
}
