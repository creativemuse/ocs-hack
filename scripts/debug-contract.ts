import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Debugging TriviaBattle Contract State...\n");

  // Contract address on Base Sepolia
  const contractAddress = "0x08e4e701a311c3c2F1EB24AF2E49A7281ec74ee6";
  
  // USDC address on Base Sepolia
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Get contract instance
  const TriviaBattle = await ethers.getContractFactory("TriviaBattle");
  const contract = TriviaBattle.attach(contractAddress);
  
  // Get USDC contract
  const usdcAbi = ["function balanceOf(address owner) view returns (uint256)", "function allowance(address owner, address spender) view returns (uint256)"];
  const usdc = new ethers.Contract(usdcAddress, usdcAbi, ethers.provider);
  
  try {
    // Check current session info
    console.log("📊 Current Session Info:");
    const sessionInfo = await contract.getSessionInfo();
    console.log("Session Info:", sessionInfo);
    
    // Check if session is active
    const isActive = await contract.currentSession();
    console.log("Is Active:", isActive);
    
    // Check current timestamp
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock?.timestamp;
    console.log("Current Timestamp:", currentTimestamp);
    
    // Check USDC balance and allowance for the caller
    const [signers] = await ethers.getSigners();
    const caller = signers[0].address;
    
    console.log("\n💰 USDC Status for", caller);
    const balance = await usdc.balanceOf(caller);
    const allowance = await usdc.allowance(caller, contractAddress);
    const entryFee = await contract.ENTRY_FEE();
    
    console.log("USDC Balance:", ethers.formatUnits(balance, 6));
    console.log("USDC Allowance:", ethers.formatUnits(allowance, 6));
    console.log("Entry Fee Required:", ethers.formatUnits(entryFee, 6));
    
    // Check if player has already joined
    const playerScore = await contract.getPlayerScore(caller);
    console.log("Player Score:", playerScore);
    
    console.log("\n🔍 Potential Issues:");
    
    if (!isActive.isActive) {
      console.log("❌ No active session - call startSession() first");
    }
    
    if (currentTimestamp && isActive.startTime && currentTimestamp < isActive.startTime) {
      console.log("❌ Session not started yet");
    }
    
    if (currentTimestamp && isActive.endTime && currentTimestamp > isActive.endTime) {
      console.log("❌ Session has ended");
    }
    
    if (balance < entryFee) {
      console.log("❌ Insufficient USDC balance");
    }
    
    if (allowance < entryFee) {
      console.log("❌ Insufficient USDC allowance - need to approve first");
    }
    
    if (playerScore.score > 0) {
      console.log("❌ Player has already joined this session");
    }
    
    console.log("\n✅ If no issues above, the transaction should succeed");
    
  } catch (error) {
    console.error("❌ Error reading contract state:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
