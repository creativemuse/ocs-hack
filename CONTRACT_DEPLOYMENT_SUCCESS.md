# Contract Deployment Success - Base Sepolia

## Deployment Details

**Contract Address:** `0xe72Fc03137A1412354ca97282071d173Ae592D96`  
**Network:** Base Sepolia (Chain ID: 84532)  
**Deployment Date:** $(date)  
**Transaction Hash:** See `broadcast/DeployTriviaBattle.s.sol/84532/run-latest.json`  
**Verification Status:** ✅ Verified on [Basescan](https://sepolia.basescan.org/address/0xe72fc03137a1412354ca97282071d173ae592d96)

## Contract Configuration

- **USDC Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **LINK Address:** `0xE4aB69C077896252FAFBD49EFD26B5D171A32410`
- **Chainlink Functions:** `0x0000000000000000000000000000000000000000` (to be set later)
- **Chainlink Oracle:** `0x0000000000000000000000000000000000000000` (to be set later)
- **Session Interval:** 1 week (604800 seconds)
- **Entry Fee:** 1 USDC (100,000 wei, 6 decimals)
- **Owner:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`

## Contract Interface Changes

⚠️ **IMPORTANT:** The new contract has a different interface than the previous version. The following changes need to be addressed:

### Function Name Changes
- `startSession(duration)` → `startNewSession()` (no parameters, uses configured interval)
- `submitScore(score)` → `submitScores(playerAddresses[], scores[])` (takes arrays, owner/Chainlink only)
- `distributePrizes()` → Still exists, but also `endSession()` available
- `claimWinnings()` → **REMOVED** (prizes distributed automatically)
- Trial player functions → **REMOVED** (not in this contract version)

### New Functions
- `startNewSession()` - Starts a new session (owner only)
- `endSession()` - Ends current session and distributes prizes (owner only)
- `submitScores(address[] calldata playerAddresses, uint256[] calldata scores)` - Submit scores for multiple players (owner/Chainlink only)
- `distributePrizes()` - Can be called by owner or Chainlink for automation
- `initiateEmergencyWithdraw()` - Initiate emergency withdrawal with timelock
- `executeWithdrawal()` - Execute pending withdrawal after timelock
- `setChainlinkOracle(address)` - Set Chainlink oracle address
- `setChainlinkFunctions(address)` - Set Chainlink Functions address

### Removed Functions
- `claimWinnings()` - Prizes are now distributed automatically
- `joinTrialBattle(sessionId)` - Trial mode not in this contract
- `submitTrialScore(sessionId, score)` - Trial mode not in this contract
- `getTrialPlayerScore(sessionId)` - Trial mode not in this contract

## Next Steps

### 1. Update Environment Variables

Add to your `.env` file:
```bash
# Base Sepolia Contract Address
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS_SEPOLIA=0xe72Fc03137A1412354ca97282071d173Ae592D96

# For production (when deployed to mainnet)
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xe72Fc03137A1412354ca97282071d173Ae592D96
```

### 2. Update Contract ABI

The ABI needs to be updated in `lib/blockchain/contracts.ts`. The compiled ABI is available at:
- `out/TriviaBattle.sol/TriviaBattle.json`
- Or extract with: `cat out/TriviaBattle.sol/TriviaBattle.json | jq -r '.abi'`

### 3. Update Frontend Hooks

The following hooks need to be updated to match the new contract interface:
- `hooks/useTriviaContract.ts` - Update function calls
- `hooks/useSponsoredTriviaContract.ts` - Update function calls
- `components/game/GameEntry.tsx` - Update to use new contract functions

### 4. Set Chainlink Addresses (When Ready)

Once Chainlink Functions is configured:
```bash
cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "setChainlinkFunctions(address)" <CHAINLINK_FUNCTIONS_ADDRESS> \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "setChainlinkOracle(address)" <CHAINLINK_ORACLE_ADDRESS> \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

### 5. Start First Session

```bash
cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "startNewSession()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

## Testing the Contract

### Check Contract State
```bash
# Check owner
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 "owner()" --rpc-url base_sepolia

# Check entry fee
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 "entryFee()" --rpc-url base_sepolia

# Check session interval
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 "sessionInterval()" --rpc-url base_sepolia

# Check if session is active
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 "isSessionActive()" --rpc-url base_sepolia

# Get current players
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 "getCurrentPlayers()" --rpc-url base_sepolia
```

### Join Battle (Test)
1. Approve USDC spending:
```bash
cast send 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "approve(address,uint256)" 0xe72Fc03137A1412354ca97282071d173Ae592D96 1000000 \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

2. Join battle:
```bash
cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "joinBattle()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

## Deployment Files

- **Broadcast Transaction:** `broadcast/DeployTriviaBattle.s.sol/84532/run-latest.json`
- **Sensitive Data:** `cache/DeployTriviaBattle.s.sol/84532/run-latest.json`
- **Contract Source:** `contracts/TriviaBattle.sol`
- **Deployment Script:** `script/DeployTriviaBattle.s.sol`

## Mainnet Deployment

When ready to deploy to Base Mainnet:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

**Mainnet Addresses:**
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- LINK: `0x88DfaAABaf06f3a41D260BEA10568C1b4794334c`

## Security Notes

- ✅ Contract verified on Basescan
- ✅ Owner address: `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`
- ⚠️ Chainlink addresses need to be set when Chainlink Functions is configured
- ⚠️ Frontend needs to be updated to match new contract interface
- ⚠️ Test thoroughly on Sepolia before mainnet deployment
