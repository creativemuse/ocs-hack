# ✅ TriviaBattle Deployment Success - Base Sepolia

## Deployment Details

**Status:** ✅ Successfully Deployed

**Contract Address:** `0x060d87018EE78c2968959cA2C8a189c12953Cc9A`

**Network:** Base Sepolia (Chain ID: 84532)

**Transaction Hash:** `0x221329422d14e37e9225df0e1ff394d0e4f3cf19ab4fe09d404fe55695544eca`

**Block Number:** 36285986

**Gas Used:** 1,982,646 gas

**Gas Cost:** 0.0000023791752 ETH

**Deployer/Owner:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`

## Contract Configuration

- **USDC Token:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **LINK Token:** `0xE4aB69C077896252FAFBD49EFD26B5D171A32410`
- **Chainlink Functions:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294` (placeholder - update after Chainlink setup)
- **Chainlink Oracle:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294` (placeholder - update after Chainlink setup)
- **Session Interval:** 1 week (604,800 seconds)
- **Entry Fee:** 1 USDC (1,000,000 = 1e6)
- **Prize Percentage:** 80%

## View on Basescan

🔗 **Contract:** https://sepolia.basescan.org/address/0x060d87018EE78c2968959cA2C8a189c12953Cc9A

🔗 **Transaction:** https://sepolia.basescan.org/tx/0x221329422d14e37e9225df0e1ff394d0e4f3cf19ab4fe09d404fe55695544eca

## Next Steps

### 1. Verify Contract on Basescan

Set your `ETHERSCAN_API_KEY` in `.env` and run:

```bash
forge verify-contract \
  0x060d87018EE78c2968959cA2C8a189c12953Cc9A \
  contracts/TriviaBattle.sol:TriviaBattle \
  --chain-id 84532 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint256,uint256,uint256)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 0xE4aB69C077896252FAFBD49EFD26B5D171A32410 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 604800 1000000 80) \
  --watch
```

### 2. Update Application Configuration

Update `lib/blockchain/contracts.ts` with the new contract address:

```typescript
export const TRIVIA_CONTRACT_ADDRESS = "0x060d87018EE78c2968959cA2C8a189c12953Cc9A";
```

### 3. Update Chainlink Oracle Address (When Ready)

Once you have the Chainlink Functions forwarder address, update it:

```bash
cast send 0x060d87018EE78c2968959cA2C8a189c12953Cc9A \
  "setChainlinkOracle(address)" <CHAINLINK_FORWARDER_ADDRESS> \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

### 4. Test the Contract

```bash
# Check contract owner
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "owner()" --rpc-url base_sepolia

# Check session info
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "getSessionInfo()" --rpc-url base_sepolia

# Start first session (as owner)
cast send 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "startNewSession()" \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY
```

### 5. Chainlink CRE Workflow

The Chainlink CRE workflow configuration is already updated with this contract address in:
- `chainlink-cre-workflows/weekly-prize-distribution/config.staging.json`

Once you deploy the CRE workflow, it will automatically call `distributePrizes()` weekly.

## Deploy to Base Mainnet

When ready for mainnet deployment:

```bash
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

**⚠️ Important:** Only deploy to mainnet after thorough testing on Sepolia!

## Contract Functions

### Owner Functions
- `startNewSession()` - Start a new game session
- `endSession()` - End current session and distribute prizes
- `submitScores(address[] calldata, uint256[] calldata)` - Submit player scores
- `setChainlinkOracle(address)` - Update Chainlink oracle address
- `setSessionInterval(uint256)` - Update session interval
- `setEntryFee(uint256)` - Update entry fee
- `setPrizePercentage(uint256)` - Update prize percentage

### Public Functions
- `joinSession()` - Join the current session (requires 1 USDC)
- `getSessionInfo()` - Get current session information
- `getPlayerScore(address)` - Get a player's score
- `getCurrentPlayers()` - Get list of current players

## Security Notes

- ✅ Contract uses SafeERC20 for all token transfers
- ✅ ReentrancyGuard protection on state-changing functions
- ✅ Two-step ownership transfer implemented
- ✅ Max approval check in `joinSession()`
- ✅ Front-running protection with session intervals

## Support

- Contract on Basescan: https://sepolia.basescan.org/address/0x060d87018EE78c2968959cA2C8a189c12953Cc9A
- Base Documentation: https://docs.base.org
- Foundry Documentation: https://book.getfoundry.sh
