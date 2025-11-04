const { ethers } = require('hardhat');
const hre = require('hardhat');

async function main() {
  // New contract with claim-based prize distribution
  const CONTRACT_ADDRESS = `${process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS}`;
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  const PLATFORM_FEE_RECIPIENT = '0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260';

  console.log('🔍 Verifying deployed contract...');
  console.log('Contract Address:', CONTRACT_ADDRESS);
  console.log('Network: Base Mainnet');
  
  try {
    // Get the contract factory
    const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
    
    // Attach to the deployed contract
    const triviaBattle = TriviaBattle.attach(CONTRACT_ADDRESS);
    
    // Get contract details
    const owner = await triviaBattle.owner();
    const usdcToken = await triviaBattle.usdcToken();
    const entryFee = await triviaBattle.ENTRY_FEE();
    const platformFeeBps = await triviaBattle.PLATFORM_FEE_BPS();
    const platformFeeRecipient = await triviaBattle.platformFeeRecipient();
    
    console.log('✅ Contract connectivity verified!');
    console.log('📋 Contract details:');
    console.log('   - Owner:', owner);
    console.log('   - USDC Token:', usdcToken);
    console.log('   - Entry Fee:', ethers.formatUnits(entryFee, 6), 'USDC');
    console.log('   - Platform Fee:', platformFeeBps.toString(), 'BPS (2.5%)');
    console.log('   - Platform Fee Recipient:', platformFeeRecipient);
    
    // Verify on Basescan
    console.log('\n🔍 Verifying contract on Basescan...');
    try {
      await hre.run('verify:verify', {
        address: CONTRACT_ADDRESS,
        constructorArguments: [USDC_ADDRESS, PLATFORM_FEE_RECIPIENT],
        network: 'base',
      });
      console.log('✅ Contract verified on Basescan!');
      console.log(`🔗 View at: https://basescan.org/address/${CONTRACT_ADDRESS}#code`);
    } catch (verifyError) {
      if (verifyError.message.includes('Already Verified')) {
        console.log('✅ Contract already verified on Basescan');
        console.log(`🔗 View at: https://basescan.org/address/${CONTRACT_ADDRESS}#code`);
      } else {
        console.log('⚠️  Basescan verification failed:', verifyError.message);
        console.log('   Contract is deployed and working, but source code not verified yet');
        console.log('   You can manually verify at: https://basescan.org/verifyContract');
      }
    }
    
    console.log('\n📝 Contract has been updated in contracts.ts');
    console.log('✅ All set! Ready to use claim-based prize distribution.');
    
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
