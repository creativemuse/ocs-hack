const { ethers } = require("hardhat");

async function main() {
  console.log("🎮 Starting TriviaBattle Session...\n");

  // Contract address on Base Sepolia
  const contractAddress = "0x08e4e701a311c3c2F1EB24AF2E49A7281ec74ee6";
  
  // Get contract instance
  const TriviaBattle = await ethers.getContractFactory("TriviaBattle");
  const contract = TriviaBattle.attach(contractAddress);
  
  try {
    // Check if session is already active
    const currentSession = await contract.currentSession();
    console.log("Current session active:", currentSession.isActive);
    
    if (currentSession.isActive) {
      console.log("❌ Session already active!");
      return;
    }
    
    // Start a 5-minute session (300 seconds)
    const duration = 300; // 5 minutes
    console.log(`Starting session with duration: ${duration} seconds (${duration/60} minutes)`);
    
    const tx = await contract.startSession(duration);
    console.log("Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ Session started successfully!");
    
    // Verify session is active
    const newSession = await contract.currentSession();
    console.log("New session active:", newSession.isActive);
    console.log("Session start time:", new Date(Number(newSession.startTime) * 1000));
    console.log("Session end time:", new Date(Number(newSession.endTime) * 1000));
    
  } catch (error) {
    console.error("❌ Error starting session:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
