const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('💰 Withdrawing USDC from TriviaBattle contract...\n');
  
  // Contract address
  const CONTRACT_ADDRESS = `${process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS}`;
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  console.log('📋 Details:');
  console.log('   - Contract:', CONTRACT_ADDRESS);
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
    
    // Check USDC balance in contract
    const balance = await usdc.balanceOf(CONTRACT_ADDRESS);
    const decimals = await usdc.decimals();
    const symbol = await usdc.symbol();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    console.log(`\n💵 Contract Balance: ${balanceFormatted} ${symbol}`);
    
    if (balance === 0n) {
      console.log('✅ No funds to withdraw - contract is empty');
      return;
    }
    
    // Load contract ABI from artifacts (avoids compilation issues)
    const artifactPath = path.join(__dirname, '../artifacts/contracts/TriviaBattle.sol/TriviaBattle.json');
    let contractAbi;
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      contractAbi = artifact.abi;
      console.log('   ✅ Loaded contract ABI from artifacts');
    } else {
      // Fallback: minimal ABI with only the functions we need
      console.log('   ⚠️  Artifact not found, using minimal ABI');
      contractAbi = [
        'function owner() view returns (address)',
        'function emergencyWithdraw()'
      ];
    }
    
    // Connect to contract using ABI
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
    
    // Check if signer is the owner
    const owner = await contract.owner();
    console.log('\n🔐 Contract Owner:', owner);
    console.log('   Your Address:', signer.address);
    console.log('   Are you owner?', owner.toLowerCase() === signer.address.toLowerCase());
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log('\n❌ ERROR: You are not the contract owner!');
      console.log('   Only the owner can call emergencyWithdraw()');
      console.log('   Please use the owner wallet to withdraw funds');
      console.log(`\n   Owner address: ${owner}`);
      return;
    }
    
    // Get your balance before
    const balanceBefore = await usdc.balanceOf(signer.address);
    const balanceBeforeFormatted = ethers.formatUnits(balanceBefore, decimals);
    
    // Proceed with withdrawal
    console.log(`\n💸 Withdrawing ${balanceFormatted} ${symbol}...`);
    console.log('⚠️  This will transfer all USDC from the contract to your wallet');
    console.log(`   Your current balance: ${balanceBeforeFormatted} ${symbol}`);
    
    const tx = await contract.emergencyWithdraw();
    console.log('\n⏳ Transaction submitted:', tx.hash);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    // Check new balances
    const newContractBalance = await usdc.balanceOf(CONTRACT_ADDRESS);
    const yourBalanceAfter = await usdc.balanceOf(signer.address);
    
    console.log('\n💵 Final Balances:');
    console.log('   - Contract:', ethers.formatUnits(newContractBalance, decimals), symbol);
    console.log('   - Your Wallet:', ethers.formatUnits(yourBalanceAfter, decimals), symbol);
    
    const received = yourBalanceAfter - balanceBefore;
    console.log(`\n💵 Amount received: ${ethers.formatUnits(received, decimals)} ${symbol}`);
    
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
      console.log('4. Verify your .env file has the correct private key');
      console.log(`\nFull error: ${error}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
