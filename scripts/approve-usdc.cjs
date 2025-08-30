const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Approving USDC for TriviaBattle Contract...\n");

  // Contract address on Base Sepolia
  const contractAddress = "0x08e4e701a311c3c2F1EB24AF2E49A7281ec74ee6";
  
  // USDC address on Base Sepolia
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // USDC ABI for approve function
  const usdcAbi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)"
  ];
  
  const usdc = new ethers.Contract(usdcAddress, usdcAbi, ethers.provider);
  const signers = await ethers.getSigners();
  const caller = signers[0];
  
  try {
    // Check current allowance
    const currentAllowance = await usdc.allowance(caller.address, contractAddress);
    const balance = await usdc.balanceOf(caller.address);
    const entryFee = ethers.parseUnits("1", 6); // 1 USDC
    
    console.log("Current USDC balance:", ethers.formatUnits(balance, 6));
    console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6));
    console.log("Required allowance:", ethers.formatUnits(entryFee, 6));
    
    if (currentAllowance >= entryFee) {
      console.log("✅ Already have sufficient allowance!");
      return;
    }
    
    // Approve USDC spending
    console.log("Approving USDC spending...");
    const tx = await usdc.connect(caller).approve(contractAddress, entryFee);
    console.log("Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ USDC approval successful!");
    
    // Verify new allowance
    const newAllowance = await usdc.allowance(caller.address, contractAddress);
    console.log("New allowance:", ethers.formatUnits(newAllowance, 6));
    
  } catch (error) {
    console.error("❌ Error approving USDC:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
