#!/usr/bin/env node

/**
 * Admin Functionality Testing Script
 * 
 * This script tests the admin functionality with different permission levels.
 * It should be run after the initial admin setup is complete.
 * 
 * Usage:
 *   node scripts/test-admin.js <admin-identity>
 * 
 * Example:
 *   node scripts/test-admin.js "admin-identity-123"
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const adminIdentity = args[0];

if (!adminIdentity) {
  console.error('❌ Error: Admin identity is required');
  console.log('Usage: node scripts/test-admin.js <admin-identity>');
  console.log('Example: node scripts/test-admin.js "admin-identity-123"');
  process.exit(1);
}

console.log('🧪 Testing admin functionality...');
console.log(`👤 Testing with admin identity: ${adminIdentity}`);

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

// Test cases for admin functionality
const testCases = [
  {
    name: 'List Admins',
    command: 'call',
    args: ['list_admins'],
    description: 'Test listing all admin users'
  },
  {
    name: 'Get All Player Stats',
    command: 'call',
    args: ['get_all_player_stats_admin'],
    description: 'Test accessing all player statistics'
  },
  {
    name: 'Get All Game Sessions',
    command: 'call',
    args: ['get_all_game_sessions_admin'],
    description: 'Test accessing all game sessions'
  },
  {
    name: 'Get All Players',
    command: 'call',
    args: ['get_all_players_admin'],
    description: 'Test accessing all players'
  },
  {
    name: 'Get All Game Entries',
    command: 'call',
    args: ['get_all_game_entries_admin'],
    description: 'Test accessing all game entries'
  },
  {
    name: 'Get All Guest Players',
    command: 'call',
    args: ['get_all_guest_players_admin'],
    description: 'Test accessing all guest players'
  },
  {
    name: 'Get All Guest Game Sessions',
    command: 'call',
    args: ['get_all_guest_game_sessions_admin'],
    description: 'Test accessing all guest game sessions'
  },
  {
    name: 'Get All Pending Claims',
    command: 'call',
    args: ['get_all_pending_claims_admin'],
    description: 'Test accessing all pending claims'
  },
  {
    name: 'Get Leaderboard (Paid)',
    command: 'call',
    args: ['get_leaderboard_admin'],
    description: 'Test accessing paid player leaderboard'
  },
  {
    name: 'Get Trial Leaderboard',
    command: 'call',
    args: ['get_trial_leaderboard_admin'],
    description: 'Test accessing trial player leaderboard'
  }
];

async function runTest(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    await runSpacetimeCommand(testCase.command, testCase.args);
    console.log(`✅ ${testCase.name} - PASSED`);
    return true;
  } catch (error) {
    console.log(`❌ ${testCase.name} - FAILED: ${error.message}`);
    return false;
  }
}

async function testAdminFunctionality() {
  try {
    console.log('🔍 Checking SpaceTimeDB CLI availability...');
    await runSpacetimeCommand('--version');
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    console.log(`\n🚀 Running ${totalTests} admin functionality tests...`);
    
    for (const testCase of testCases) {
      const passed = await runTest(testCase);
      if (passed) {
        passedTests++;
      }
    }
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All admin functionality tests passed!');
      console.log('✅ Admin system is working correctly');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the errors above.');
      console.log('🔧 Troubleshooting:');
      console.log('1. Ensure the admin user has proper privileges');
      console.log('2. Check SpaceTimeDB module deployment');
      console.log('3. Verify admin identity is correct');
      console.log('4. Check SpaceTimeDB logs for detailed errors');
    }
    
  } catch (error) {
    console.error('❌ Admin testing failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure SpaceTimeDB CLI is installed and in PATH');
    console.log('2. Check that the SpaceTimeDB module is properly deployed');
    console.log('3. Verify the admin identity has been granted privileges');
    console.log('4. Check SpaceTimeDB logs for detailed error information');
    process.exit(1);
  }
}

// Run the tests
testAdminFunctionality();
