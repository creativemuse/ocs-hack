# Deploy to Base Mainnet Guide

## Prerequisites

1. **Set up your `.env` file** with the following variables:
   ```bash
   PRIVATE_KEY=your_private_key_without_0x_prefix
   BASE_MAINNET_RPC_URL=https://mainnet.base.org
   BASESCAN_API_KEY=your_basescan_api_key
   ```

2. **Ensure you have ETH on Base Mainnet** for gas fees:
   - You need at least 0.001-0.01 ETH (gas prices vary)
   - Bridge ETH to Base Mainnet if needed

3. **Check your balance**:
   ```bash
   # Get your address
   cast wallet address --private-key $PRIVATE_KEY
   
   # Check balance on Base Mainnet
   cast balance <YOUR_ADDRESS> --rpc-url base_mainnet
   ```

## Deployment Steps

### Step 1: Test the deployment (dry run - recommended)

Simulate the deployment to check for any issues without actually deploying:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet
```

This will show you:
- Estimated gas costs
- Contract addresses that will be used
- Any potential errors before spending real ETH

### Step 2: Deploy to Base Mainnet

Once you're satisfied with the simulation, deploy with verification:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

**What this does:**
- `--rpc-url base_mainnet`: Uses the Base Mainnet RPC endpoint (from your `.env`)
- `--broadcast`: Actually sends the transaction to the network
- `--verify`: Automatically verifies the contract on Basescan after deployment

### Alternative: Deploy without automatic verification

If you want to verify manually later, or if automatic verification fails:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast
```

Then verify manually:
```bash
forge verify-contract <CONTRACT_ADDRESS> \
  contracts/TriviaBattle.sol:TriviaBattle \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY
```

## After Deployment

1. **Save the contract address** from the deployment output

2. **Update your frontend configuration**:
   - Update `lib/blockchain/contracts.ts` with the new contract address

3. **Verify on Basescan**:
   - Visit: `https://basescan.org/address/<CONTRACT_ADDRESS>`
   - Confirm the contract is verified and shows source code

4. **Test the deployment**:
   - Ensure you have USDC on Base Mainnet
   - Test basic contract functions
   - Verify Chainlink integration if applicable

## Contract Configuration

The contract is deployed with:
- **USDC Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet USDC)
- **LINK Address**: `0x88DFAAABAf06f3A41d260Bea10568C1B4794334C` (Base Mainnet LINK)
- **Session Interval**: 1 week (604800 seconds)
- **Entry Fee**: 1 USDC (1e6)

## Important Notes

⚠️ **Security Reminders:**
- Never commit your `.env` file to version control
- Keep your private key secure
- Double-check all addresses before deploying
- Test thoroughly on Base Sepolia before mainnet deployment

📋 **Post-Deployment Checklist:**
- [ ] Contract deployed and verified on Basescan
- [ ] Contract address saved and updated in frontend
- [ ] Basic contract functions tested
- [ ] USDC balance sufficient for testing
- [ ] Chainlink addresses configured (if needed)

## Troubleshooting

**If deployment fails:**
1. Check your ETH balance is sufficient
2. Verify RPC URL is correct and accessible
3. Ensure private key is correct (without 0x prefix)
4. Check gas prices - try during lower traffic times

**If verification fails:**
1. Wait a few minutes and try manual verification
2. Ensure BASESCAN_API_KEY is correct
3. Check that contract code matches exactly

## Getting Help

- Basescan: https://basescan.org
- Base Docs: https://docs.base.org
- Forge Docs: https://book.getfoundry.sh
