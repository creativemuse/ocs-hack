const { ethers } = require('hardhat');

async function main() {
  console.log('💰 Withdrawing funds from old TriviaBattle contract...\n');
  
  // Old contract address
  const OLD_CONTRACT_ADDRESS = '0x231240B1d776a8F72785FE3707b74Ed9C3048B3a';
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  console.log('📋 Details:');
  console.log('   - Old Contract:', OLD_CONTRACT_ADDRESS);
  console.log('   - USDC Token:', USDC_ADDRESS);
  console.log('   - Network: Base Mainnet\n');
  
  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log('   - Your Address:', signer.address);
    
    // Connect to USDC token
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
    
    // Check USDC balance in old contract
    const balance = await usdc.balanceOf(OLD_CONTRACT_ADDRESS);
    const decimals = await usdc.decimals();
    const symbol = await usdc.symbol();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    console.log(`\n💵 Contract Balance: ${balanceFormatted} ${symbol}`);
    
    if (balance === 0n) {
      console.log('✅ No funds to withdraw - contract is empty');
      return;
    }
    
    // Connect to old contract
    const TriviaBattle = await ethers.getContractFactory('TriviaBattle');
    const oldContract = TriviaBattle.attach(OLD_CONTRACT_ADDRESS);
    
    // Check if signer is the owner
    const owner = await oldContract.owner();
    console.log('\n🔐 Contract Owner:', owner);
    console.log('   Your Address:', signer.address);
    console.log('   Are you owner?', owner.toLowerCase() === signer.address.toLowerCase());
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log('\n❌ ERROR: You are not the contract owner!');
      console.log('   Only the owner can call emergencyWithdraw()');
      console.log('   Please use the owner wallet to withdraw funds');
      return;
    }
    
    // Proceed with withdrawal
    console.log(`\n💸 Withdrawing ${balanceFormatted} ${symbol}...`);
    console.log('⚠️  This will transfer all USDC from the old contract to your wallet');
    
    const tx = await oldContract.emergencyWithdraw();
    console.log('\n⏳ Transaction submitted:', tx.hash);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    // Check new balances
    const newContractBalance = await usdc.balanceOf(OLD_CONTRACT_ADDRESS);
    const yourBalance = await usdc.balanceOf(signer.address);
    
    console.log('\n💵 Final Balances:');
    console.log('   - Old Contract:', ethers.formatUnits(newContractBalance, decimals), symbol);
    console.log('   - Your Wallet:', ethers.formatUnits(yourBalance, decimals), symbol);
    
    console.log('\n✅ Withdrawal complete!');
    console.log('🔗 View transaction:', `https://basescan.org/tx/${tx.hash}`);
    
  } catch (error) {
    console.error('\n❌ Withdrawal failed:', error.message);
    
    if (error.message.includes('OwnableUnauthorizedAccount')) {
      console.log('\n⚠️  You are not the contract owner!');
      console.log('   Only the owner can withdraw funds from the contract');
    } else if (error.message.includes('No USDC to withdraw')) {
      console.log('\n✅ Contract is already empty - no funds to withdraw');
    } else {
      console.log('\nTroubleshooting:');
      console.log('1. Make sure you are the contract owner');
      console.log('2. Check that there are funds in the contract');
      console.log('3. Ensure your wallet is connected to Base Mainnet');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

