# Contract Verification Issue - Fix Guide

## Problem

The contract verification failed because the deployed bytecode doesn't match the current source code. This happened because:

1. **Contract was deployed** at `0x060d87018EE78c2968959cA2C8a189c12953Cc9A` on Base Sepolia
2. **After deployment**, we added the `distributePrizes()` function to the contract
3. **Verification attempt** tried to verify the new code against the old deployment

## Solution Options

### Option 1: Verify with Original Code (Recommended for Now)

If you want to verify the currently deployed contract, you need to use the original contract code (without `distributePrizes()`).

1. **Temporarily remove or comment out** the `distributePrizes()` function
2. **Verify the contract**:
   ```bash
   forge verify-contract \
     0x060d87018EE78c2968959cA2C8a189c12953Cc9A \
     contracts/TriviaBattle.sol:TriviaBattle \
     --chain-id 84532 \
     --num-of-optimizations 200 \
     --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint256,uint256,uint256)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 0xE4aB69C077896252FAFBD49EFD26B5D171A32410 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 604800 1000000 80) \
     --watch
   ```
3. **Restore** the `distributePrizes()` function after verification

### Option 2: Redeploy with New Code (Recommended for Production)

Deploy a new version of the contract that includes `distributePrizes()`:

1. **Deploy the updated contract**:
   ```bash
   forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
     --rpc-url base_sepolia \
     --broadcast \
     --verify
   ```

2. **Update your configs** with the new contract address:
   - `chainlink-cre-workflows/weekly-prize-distribution/config.staging.json`
   - `lib/blockchain/contracts.ts` (if applicable)

### Option 3: Skip Verification for Now

If verification isn't critical right now, you can:
- Continue using the deployed contract
- Deploy the updated version later when ready
- The contract is functional even without verification (just not viewable on Basescan)

## Why This Happened

The deployed contract at `0x060d87018EE78c2968959cA2C8a189c12953Cc9A` was compiled from the source code **before** we added `distributePrizes()`. When we try to verify it with the new code that includes `distributePrizes()`, the bytecode doesn't match.

## Next Steps

1. **For immediate use**: The deployed contract works fine, just doesn't have `distributePrizes()` yet
2. **For Chainlink CRE**: You'll need to redeploy with `distributePrizes()` function
3. **For verification**: Use Option 1 to verify the current deployment, or Option 2 to deploy and verify the new version

## Important Note

The `distributePrizes()` function is needed for Chainlink CRE automation. If you want to use automated weekly prize distribution, you'll need to redeploy the contract with this function included.
