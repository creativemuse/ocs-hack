const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying TriviaBattle contract to Base Sepolia...');
  
  // USDC token address on Base Sepolia
  const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
  
  console.log('📋 Deployment details:');
  console.log('   - Network: Base Sepolia');
  console.log('   - USDC Address:', USDC_ADDRESS);
  console.log('   - Entry Fee: 1 USDC');
  
  // Deploy the contract
  const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
  const triviaBattle = await TriviaBattle.deploy(USDC_ADDRESS);
  
  await triviaBattle.waitForDeployment();
  const contractAddress = await triviaBattle.getAddress();
  
  console.log('✅ TriviaBattle deployed to:', contractAddress);
  console.log('📋 Contract details:');
  console.log('   - Owner:', await triviaBattle.owner());
  console.log('   - USDC Token:', await triviaBattle.usdcToken());
  console.log('   - Entry Fee:', await triviaBattle.ENTRY_FEE());
  
  // Verify the deployment
  console.log('\n🔍 Verifying contract on Basescan...');
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [USDC_ADDRESS],
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
    network: 'base-sepolia',
    contractAddress,
    usdcAddress: USDC_ADDRESS,
    owner: await triviaBattle.owner(),
    deploymentTime: new Date().toISOString(),
    basescanUrl: `https://sepolia.basescan.org/address/${contractAddress}`
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
