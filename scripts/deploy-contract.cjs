const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying TriviaBattle contract to Base Mainnet...');
  
  // USDC token address on Base Mainnet
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  // Platform fee recipient
  const PLATFORM_FEE_RECIPIENT = '0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260';
  
  console.log('📋 Deployment details:');
  console.log('   - Network: Base Mainnet');
  console.log('   - USDC Address:', USDC_ADDRESS);
  console.log('   - Entry Fee: 1 USDC');
  console.log('   - Platform Fee: 2.5% (250 basis points)');
  console.log('   - Platform Fee Recipient:', PLATFORM_FEE_RECIPIENT);
  
  // Deploy the contract
  const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
  const triviaBattle = await TriviaBattle.deploy(USDC_ADDRESS, PLATFORM_FEE_RECIPIENT);
  
  await triviaBattle.waitForDeployment();
  const contractAddress = await triviaBattle.getAddress();
  
  console.log('✅ TriviaBattle deployed to:', contractAddress);
  console.log('📋 Contract details:');
  console.log('   - Owner:', await triviaBattle.owner());
  console.log('   - USDC Token:', await triviaBattle.usdcToken());
  console.log('   - Entry Fee:', await triviaBattle.ENTRY_FEE());
  console.log('   - Platform Fee (BPS):', await triviaBattle.PLATFORM_FEE_BPS());
  console.log('   - Platform Fee Recipient:', await triviaBattle.platformFeeRecipient());
  
  // Verify the deployment
  console.log('\n🔍 Verifying contract on Basescan...');
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [USDC_ADDRESS, PLATFORM_FEE_RECIPIENT],
    });
    console.log('✅ Contract verified on Basescan');
  } catch (error) {
    console.log('⚠️  Contract verification failed:', error);
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. Update TRIVIA_CONTRACT_ADDRESS in lib/blockchain/contracts.ts');
  console.log('2. Test the contract with USDC transfers');
  console.log('3. Start your first game session!');
  
  // Save deployment info
  const deploymentInfo = {
    network: 'base-mainnet',
    contractAddress,
    usdcAddress: USDC_ADDRESS,
    platformFeeRecipient: PLATFORM_FEE_RECIPIENT,
    platformFeeBps: 250,
    owner: await triviaBattle.owner(),
    deploymentTime: new Date().toISOString(),
    basescanUrl: `https://basescan.org/address/${contractAddress}`
  };
  
  console.log('\n📄 Deployment Info:');
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
