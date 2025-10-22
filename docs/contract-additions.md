# Suggested Contract Additions for Prize Claims

## Add Individual Claim Function

```solidity
// Add to your contract
mapping(address => uint256) public playerWinnings;
mapping(address => bool) public hasClaimed;

event WinningsClaimed(address indexed player, uint256 amount);

function claimWinnings() external {
    require(playerWinnings[msg.sender] > 0, "No winnings to claim");
    require(!hasClaimed[msg.sender], "Already claimed");
    
    uint256 amount = playerWinnings[msg.sender];
    playerWinnings[msg.sender] = 0;
    hasClaimed[msg.sender] = true;
    
    usdcToken.transfer(msg.sender, amount);
    emit WinningsClaimed(msg.sender, amount);
}

// Modify distributePrizes to set player winnings instead of transferring immediately
function distributePrizes() external onlyOwner {
    // ... existing logic ...
    
    for (uint i = 0; i < winners.length; i++) {
        playerWinnings[winners[i]] += amounts[i];
        // Remove immediate transfer: usdcToken.transfer(winners[i], amounts[i]);
    }
    
    emit PrizesDistributed(sessionId, winners, amounts);
}
```

## Frontend Integration

```typescript
// Add to useTriviaContract hook
const claimWinnings = useCallback(async () => {
  if (!address || !isConnected) {
    setState(prev => ({ ...prev, error: 'Wallet not connected' }));
    return;
  }

  setState(prev => ({ ...prev, isClaiming: true, error: null }));

  try {
    if (useGasless) {
      const claimData = {
        contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'claimWinnings',
        args: [],
      };

      await sendTransaction({
        calls: [claimData],
        gasless: true,
        paymasterConfig: {
          type: 'coinbase',
        },
      });
    } else {
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'claimWinnings',
      });
    }
  } catch (error) {
    console.error('Error claiming winnings:', error);
    setState(prev => ({
      ...prev,
      isClaiming: false,
      error: error instanceof Error ? error.message : 'Failed to claim winnings',
    }));
  }
}, [address, isConnected, writeContractAsync, sendTransaction, useGasless]);
```

## Benefits of Individual Claims

1. **Gasless Claims**: Players can claim winnings without gas fees
2. **Better UX**: Players control when they receive their winnings
3. **Flexibility**: Players can claim partial amounts if needed
4. **Reduced Admin Load**: No need for admin to manually distribute
5. **Transparency**: Players can see their pending winnings
