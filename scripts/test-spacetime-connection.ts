/**
 * Test SpaceTimeDB Connection
 * This script helps diagnose SpaceTimeDB connection issues
 */

import { DbConnection } from '../lib/spacetime/database';

const config = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  database: process.env.SPACETIME_DATABASE || '',
  module: process.env.SPACETIME_MODULE || 'beat-me',
  token: process.env.SPACETIME_TOKEN || undefined,
};

console.log('🔍 SpaceTimeDB Connection Test');
console.log('================================');
console.log('Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Database: ${config.database}`);
console.log(`  Module: ${config.module}`);
console.log(`  Token: ${config.token ? '***' + config.token.slice(-8) : 'Not set'}`);
console.log('');

// Build WebSocket URI
const wsUri = `${config.host.replace('https://', 'wss://').replace('http://', 'ws://')}/database/subscribe/${config.database}`;
console.log(`📡 WebSocket URI: ${wsUri}`);
console.log('');

// Test connection
console.log('🔌 Attempting to connect...');

const builder = DbConnection.builder()
  .withUri(wsUri)
  .withDatabaseName(config.module)
  .onConnect((conn, identity, token) => {
    console.log('✅ Connection successful!');
    console.log(`   Identity: ${identity.toHexString()}`);
    console.log(`   Token: ${token ? '***' + token.slice(-8) : 'None'}`);
    console.log(`   Active: ${conn.isActive}`);
    process.exit(0);
  })
  .onDisconnect(() => {
    console.log('🔌 Disconnected from SpacetimeDB');
  })
  .onConnectError((error) => {
    console.error('❌ Connection error:', error);
    console.error('');
    console.error('Possible issues:');
    console.error('  1. Database ID is incorrect (should be the database address, not identity)');
    console.error('  2. Module name is incorrect');
    console.error('  3. Database is not accessible or doesn\'t exist');
    console.error('  4. Network/firewall issues');
    process.exit(1);
  });

if (config.token) {
  builder.withToken(config.token);
}

const connection = builder.build();

// Set timeout
setTimeout(() => {
  console.error('⏱️  Connection timeout after 15 seconds');
  console.error('');
  console.error('The connection did not establish. Please check:');
  console.error('  1. Is SPACETIME_DATABASE the correct database address?');
  console.error('  2. Is the database published and accessible?');
  console.error('  3. Is the module name correct?');
  console.error('');
  console.error('To find your database address, run:');
  console.error('  spacetime ls');
  process.exit(1);
}, 15000);

