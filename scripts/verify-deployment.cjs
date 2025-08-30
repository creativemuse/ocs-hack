const { ethers } = require('hardhat');

async function main() {
  // Replace this with your actual deployed contract address
  const CONTRACT_ADDRESS = '0x08e4e701a311c3c2F1EB24AF2E49A7281ec74ee6';
  
  if (CONTRACT_ADDRESS === 'YOUR_CONTRACT_ADDRESS_HERE') {
    console.log('❌ Please update the CONTRACT_ADDRESS in this script with your deployed contract address');
    return;
  }

  console.log('🔍 Verifying deployed contract...');
  console.log('Contract Address:', CONTRACT_ADDRESS);
  
  try {
    // Get the contract factory
    const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
    
    // Attach to the deployed contract
    const triviaBattle = TriviaBattle.attach(CONTRACT_ADDRESS);
    
    // Get contract details
    const owner = await triviaBattle.owner();
    const usdcToken = await triviaBattle.usdcToken();
    const entryFee = await triviaBattle.ENTRY_FEE();
    
    console.log('✅ Contract verification successful!');
    console.log('📋 Contract details:');
    console.log('   - Owner:', owner);
    console.log('   - USDC Token:', usdcToken);
    console.log('   - Entry Fee:', ethers.formatUnits(entryFee, 6), 'USDC');
    
    // Update the contracts.ts file
    console.log('\n📝 Next steps:');
    console.log('1. Update TRIVIA_CONTRACT_ADDRESS in lib/blockchain/contracts.ts with:', CONTRACT_ADDRESS);
    console.log('2. Test the contract with USDC transfers');
    console.log('3. Start your first game session!');
    
    // Generate the update command
    console.log('\n🔧 To update your configuration, run:');
    console.log(`sed -i '' 's/0x0000000000000000000000000000000000000001/${CONTRACT_ADDRESS}/g' lib/blockchain/contracts.ts`);
    
  } catch (error) {
    console.error('❌ Contract verification failed:', error.message);
    console.log('This might mean:');
    console.log('1. The contract address is incorrect');
    console.log('2. The contract deployment failed');
    console.log('3. There\'s a network connectivity issue');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
