const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  console.log('💰 Withdrawing USDC from TriviaBattle contract...\n');
  
  // Contract address
  const CONTRACT_ADDRESS = `${process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS}`;
  const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  
  // Base Mainnet RPC URL
  const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!PRIVATE_KEY) {
    console.error('❌ ERROR: PRIVATE_KEY not found in .env file');
    console.log('   Please add your private key to .env:');
    console.log('   PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }
  
  console.log('📋 Details:');
  console.log('   - Contract:', CONTRACT_ADDRESS);
  console.log('   - USDC Token:', USDC_ADDRESS);
  console.log('   - Network: Base Mainnet');
  console.log('   - RPC URL:', RPC_URL, '\n');
  
  try {
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
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
    
    // Extended ABI to support both TriviaBattle and TriviaBattlev2/v3/v4
    const contractAbi = [
      'function owner() view returns (address)',
      'function emergencyWithdraw()',
      'function withdrawPlatformFees()',
      'function accumulatedPlatformFees() view returns (uint256)'
    ];
    
    // Connect to contract
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
    
    // Try to determine which withdrawal method to use
    let withdrawalMethod = null;
    let useEmergencyWithdraw = false;
    
    // First, try to check if it has withdrawPlatformFees (newer versions)
    try {
      const accumulatedFees = await contract.accumulatedPlatformFees().catch(() => null);
      if (accumulatedFees !== null && accumulatedFees > 0n) {
        const feesFormatted = ethers.formatUnits(accumulatedFees, decimals);
        console.log(`\n📊 Accumulated Platform Fees: ${feesFormatted} ${symbol}`);
        withdrawalMethod = 'withdrawPlatformFees';
        console.log('   ✅ Detected newer contract version (TriviaBattlev2/v3/v4)');
      } else if (accumulatedFees !== null && accumulatedFees === 0n) {
        withdrawalMethod = 'withdrawPlatformFees';
        console.log('\n   ⚠️  Detected newer contract but no accumulated fees');
        console.log('   ℹ️  Platform fees may be auto-distributed or contract may hold funds differently');
      }
    } catch (e) {
      // Function doesn't exist, will try emergencyWithdraw
    }
    
    // If we couldn't detect, try emergencyWithdraw
    if (!withdrawalMethod) {
      // Try calling emergencyWithdraw to see if it exists
      try {
        // Just check if the function exists by encoding it
        const iface = new ethers.Interface(contractAbi);
        const emergencyData = iface.encodeFunctionData('emergencyWithdraw', []);
        console.log('\n   ℹ️  Function signature exists for emergencyWithdraw');
        withdrawalMethod = 'emergencyWithdraw';
        useEmergencyWithdraw = true;
      } catch (e) {
        console.log('\n   ❌ Neither emergencyWithdraw nor withdrawPlatformFees found');
        console.log('   This contract may not support direct withdrawal functions');
        return;
      }
    }
    
    // Proceed with withdrawal
    console.log(`\n💸 Attempting withdrawal...`);
    console.log(`   Method: ${withdrawalMethod}`);
    console.log('⚠️  This will transfer USDC from the contract to your wallet');
    console.log(`   Your current balance: ${balanceBeforeFormatted} ${symbol}`);
    
    let tx;
    try {
      if (useEmergencyWithdraw) {
        // Use emergencyWithdraw (withdraws all USDC in contract)
        console.log('   Trying emergencyWithdraw()...');
        tx = await contract.emergencyWithdraw({
          gasLimit: 150000 // Set manual gas limit
        });
      } else {
        // Use withdrawPlatformFees (withdraws only accumulated fees)
        console.log('   Trying withdrawPlatformFees()...');
        tx = await contract.withdrawPlatformFees({
          gasLimit: 150000 // Set manual gas limit
        });
      }
      console.log('\n⏳ Transaction submitted:', tx.hash);
    } catch (txError) {
      console.log('\n   ❌ Withdrawal function call failed:', txError.message);
      console.log('\n   🔍 Attempting alternative: Direct USDC transfer may not be supported');
      console.log('   This contract may require a different withdrawal mechanism');
      console.log('\n   Possible reasons:');
      console.log('   1. Contract uses a different withdrawal pattern');
      console.log('   2. Funds are locked in prize pools');
      console.log('   3. Contract version differs from expected');
      throw txError;
    }
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
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
    
    if (error.message.includes('OwnableUnauthorizedAccount') || error.message.includes('not the owner')) {
      console.log('\n⚠️  You are not the contract owner!');
      console.log('   Only the owner can withdraw funds from the contract');
    } else if (error.message.includes('No USDC to withdraw')) {
      console.log('\n✅ Contract is already empty - no funds to withdraw');
    } else if (error.message.includes('insufficient funds')) {
      console.log('\n⚠️  Insufficient ETH for gas fees');
      console.log('   Please ensure your wallet has enough ETH for the transaction');
    } else {
      console.log('\nTroubleshooting:');
      console.log('1. Make sure you are the contract owner');
      console.log('2. Check that there are funds in the contract');
      console.log('3. Ensure your wallet has enough ETH for gas');
      console.log('4. Verify your .env file has the correct PRIVATE_KEY');
      console.log('5. Check that BASE_RPC_URL is correct (defaults to mainnet.base.org)');
      console.log(`\nFull error: ${error}`);
      if (error.stack) {
        console.log('\nStack trace:', error.stack);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
