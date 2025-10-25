const { ethers } = require('hardhat');

async function main() {
  const NEW_CONTRACT_ADDRESS = '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13';
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  console.log('🔍 Checking new TriviaBattle contract...\n');
  
  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];
  
  const [signer] = await ethers.getSigners();
  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
  const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
  const contract = TriviaBattle.attach(NEW_CONTRACT_ADDRESS);
  
  // Check contract details
  const owner = await contract.owner();
  const platformFeeRecipient = await contract.platformFeeRecipient();
  const entryFee = await contract.ENTRY_FEE();
  const balance = await usdc.balanceOf(NEW_CONTRACT_ADDRESS);
  const decimals = await usdc.decimals();
  
  console.log('📋 Contract Details:');
  console.log('   Address:', NEW_CONTRACT_ADDRESS);
  console.log('   Owner:', owner);
  console.log('   Platform Fee Recipient:', platformFeeRecipient);
  console.log('   Entry Fee:', ethers.formatUnits(entryFee, 6), 'USDC');
  console.log('   Current Balance:', ethers.formatUnits(balance, decimals), 'USDC\n');
  
  // Check session info
  try {
    const sessionInfo = await contract.getSessionInfo();
    console.log('📊 Session Info:');
    console.log('   Is Active:', sessionInfo.isActive);
    console.log('   Prize Pool:', ethers.formatUnits(sessionInfo.prizePool, 6), 'USDC');
    console.log('   Paid Players:', sessionInfo.paidPlayerCount.toString());
    console.log('   Trial Players:', sessionInfo.trialPlayerCount.toString());
    console.log('   Prizes Distributed:', sessionInfo.prizesDistributed);
  } catch (error) {
    console.log('📊 Session Info: No active session yet');
  }
  
  console.log('\n✅ New contract is ready to use!');
  console.log('🔗 View on Basescan:', `https://basescan.org/address/${NEW_CONTRACT_ADDRESS}#code`);
  console.log('\n📝 Next steps:');
  console.log('   1. Update paymaster allowlist in CDP Dashboard');
  console.log('   2. Test the claim flow with a real game');
  console.log('   3. Monitor leaderboard updates');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

