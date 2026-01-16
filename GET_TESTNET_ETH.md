# Getting Base Sepolia Testnet ETH

Your deployment failed due to insufficient funds. You need testnet ETH to pay for gas fees.

## Current Status

- **Required:** ~0.0000036 ETH (3,607,392,600,000 wei)
- **Have:** 0 ETH
- **Contract Address (simulated):** `0x060d87018EE78c2968959cA2C8a189c12953Cc9A`
- **Deployer Address:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`

## How to Get Base Sepolia ETH

### Option 1: Coinbase Base Sepolia Faucet (Recommended)
1. Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Connect your wallet (MetaMask, Coinbase Wallet, etc.)
3. Enter your address: `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`
4. Request testnet ETH (usually 0.1 ETH per request)

### Option 2: Base Sepolia Official Faucet
1. Visit: https://www.alchemy.com/faucets/base-sepolia
2. Connect your wallet
3. Request testnet ETH

### Option 3: QuickNode Faucet
1. Visit: https://faucet.quicknode.com/base/sepolia
2. Enter your address
3. Request testnet ETH

## Verify You Received ETH

After requesting from a faucet, wait a few minutes, then check:

```bash
cast balance 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 --rpc-url base_sepolia
```

You should see a balance > 0.

## Retry Deployment

Once you have ETH, retry the deployment:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

## Alternative: Use a Different Wallet

If you have another wallet with Base Sepolia ETH:

1. Update `.env` with the new private key
2. Retry deployment

## Troubleshooting

**Still showing 0 balance?**
- Wait 2-3 minutes for the transaction to confirm
- Check the transaction on [Base Sepolia Explorer](https://sepolia.basescan.org/address/0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294)
- Try a different faucet if one doesn't work

**Faucet says "Already claimed"?**
- Some faucets have rate limits (e.g., once per 24 hours)
- Try a different faucet
- Use a different wallet address
