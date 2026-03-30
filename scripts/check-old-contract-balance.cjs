const { ethers } = require('hardhat');

async function main() {
  const OLD_CONTRACT_ADDRESS = '0x231240B1d776a8F72785FE3707b74Ed9C3048B3a';
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  console.log('🔍 Checking old contract balance...\n');
  
  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];
  
  const [signer] = await ethers.getSigners();
  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
  
  const balance = await usdc.balanceOf(OLD_CONTRACT_ADDRESS);
  const decimals = await usdc.decimals();
  const balanceFormatted = ethers.formatUnits(balance, decimals);
  
  console.log('📊 Old Contract Balance:');
  console.log('   Address:', OLD_CONTRACT_ADDRESS);
  console.log('   Balance:', balanceFormatted, 'USDC');
  console.log('   Raw Balance:', balance.toString(), 'wei\n');
  
  if (balance === 0n) {
    console.log('✅ Contract is empty - withdrawal successful!');
  } else {
    console.log('⚠️  Contract still has USDC - may need another withdrawal attempt');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

