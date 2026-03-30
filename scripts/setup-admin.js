#!/usr/bin/env node

/**
 * Initial Admin Setup Script
 * 
 * This script creates the first admin user in the SpaceTimeDB system.
 * It should be run after the SpaceTimeDB module is deployed.
 * 
 * Usage:
 *   node scripts/setup-admin.js <admin-identity> <admin-level>
 * 
 * Example:
 *   node scripts/setup-admin.js "admin-identity-123" "super_admin"
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const adminIdentity = args[0];
const adminLevel = args[1] || 'super_admin';

if (!adminIdentity) {
  console.error('❌ Error: Admin identity is required');
  console.log('Usage: node scripts/setup-admin.js <admin-identity> <admin-level>');
  console.log('Example: node scripts/setup-admin.js "admin-identity-123" "super_admin"');
  process.exit(1);
}

// Validate admin level
const validLevels = ['moderator', 'admin', 'super_admin'];
if (!validLevels.includes(adminLevel)) {
  console.error(`❌ Error: Invalid admin level "${adminLevel}"`);
  console.log(`Valid levels: ${validLevels.join(', ')}`);
  process.exit(1);
}

console.log('🔧 Setting up initial admin user...');
console.log(`👤 Admin Identity: ${adminIdentity}`);
console.log(`🔑 Admin Level: ${adminLevel}`);

// Function to run SpaceTimeDB CLI command
function runSpacetimeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: spacetime ${command} ${args.join(' ')}`);
    
    const child = spawn('spacetime', [command, ...args], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function setupAdmin() {
  try {
    // Check if SpaceTimeDB CLI is available
    console.log('🔍 Checking SpaceTimeDB CLI availability...');
    await runSpacetimeCommand('--version');
    
    // Deploy the module if not already deployed
    console.log('📦 Deploying SpaceTimeDB module...');
    await runSpacetimeCommand('publish', ['spacetime-module/beat-me']);
    
    // Create the first admin user
    console.log('👑 Creating initial admin user...');
    await runSpacetimeCommand('call', [
      'grant_admin_privileges',
      adminIdentity,
      adminLevel
    ]);
    
    console.log('✅ Initial admin setup completed successfully!');
    console.log(`🎉 Admin user "${adminIdentity}" has been granted "${adminLevel}" privileges`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test admin functionality with the new admin user');
    console.log('2. Create additional admin users as needed');
    console.log('3. Set up admin authentication in your application');
    console.log('4. Monitor admin access logs');
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure SpaceTimeDB CLI is installed and in PATH');
    console.log('2. Check that the SpaceTimeDB module is properly configured');
    console.log('3. Verify the admin identity format is correct');
    console.log('4. Check SpaceTimeDB logs for detailed error information');
    process.exit(1);
  }
}

// Run the setup
setupAdmin();
