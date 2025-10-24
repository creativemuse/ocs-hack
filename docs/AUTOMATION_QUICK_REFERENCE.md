# Chainlink Automation Quick Reference

## 🚀 Quick Start Commands

### Deploy to Sepolia
```bash
./deploy-automation-sepolia.sh 60
```

### Deploy to Mainnet
```bash
./deploy-automation-mainnet.sh 3600
```

### Check Counter Value
```bash
cast call <CONTRACT_ADDRESS> "counter()" --rpc-url $SEPOLIA_RPC_URL
```

### Check Time Until Next Upkeep
```bash
cast call <CONTRACT_ADDRESS> "getTimeUntilNextUpkeep()" --rpc-url $SEPOLIA_RPC_URL
```

## 📋 Registration Checklist

1. ✅ Deploy contract → get address
2. ✅ Get LINK tokens from faucet
3. ✅ Go to https://automation.chain.link/sepolia
4. ✅ Click "Register new Upkeep"
5. ✅ Select "Custom logic" trigger
6. ✅ Paste contract address
7. ✅ Set gas limit (500,000 recommended)
8. ✅ Fund with LINK (5-10 for testing)
9. ✅ Confirm transactions

## 🔗 Important URLs

| Network | Automation Dashboard | Faucet |
|---------|---------------------|--------|
| Sepolia | https://automation.chain.link/sepolia | https://faucets.chain.link/sepolia |
| Mainnet | https://automation.chain.link/mainnet | N/A (buy LINK) |

## ⚙️ Recommended Settings

### Testnet (Sepolia)
- **Update Interval:** 60 seconds
- **Gas Limit:** 200,000 - 500,000
- **Initial LINK:** 5-10 LINK
- **Purpose:** Testing and development

### Mainnet
- **Update Interval:** 3600 seconds (1 hour) or more
- **Gas Limit:** 500,000 - 1,000,000
- **Initial LINK:** Calculate based on frequency
- **Purpose:** Production use

## 🛠️ Monitoring Commands

```bash
# Check counter
cast call $CONTRACT "counter()" --rpc-url $RPC_URL

# Check interval
cast call $CONTRACT "interval()" --rpc-url $RPC_URL

# Check last timestamp
cast call $CONTRACT "lastTimeStamp()" --rpc-url $RPC_URL

# Check time until next
cast call $CONTRACT "getTimeUntilNextUpkeep()" --rpc-url $RPC_URL
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Upkeep not executing | Check LINK balance & verify interval passed |
| Transaction failing | Increase gas limit in dashboard |
| Out of LINK | Add more LINK via dashboard |
| Wrong network | Verify RPC URL and contract address |

## 💡 Gas Limit Guidelines

| Contract Complexity | Recommended Gas Limit |
|--------------------|----------------------|
| Simple (like Counter) | 200,000 |
| Medium | 500,000 |
| Complex | 1,000,000+ |

## 📊 Cost Estimation

**Formula:**
```
Cost per execution = Gas Used × Gas Price × Premium
Premium ≈ 1.2x (Chainlink overhead)
```

**Example (Sepolia):**
```
Gas Used: 100,000
Gas Price: 20 gwei
LINK Price: ~$15

Cost = 100,000 × 20 × 10^-9 × 1.2 × 15 ≈ 0.036 LINK per execution
```

**Daily Cost:**
```
Executions per day = 86400 / interval
Daily LINK = Executions per day × Cost per execution
```

For 60s interval:
- 1,440 executions/day
- ~51.84 LINK/day (at above rates)

## 🔐 Security Checklist

- [ ] ✅ Private key in .env (not committed)
- [ ] ✅ Contract verified on Etherscan
- [ ] ✅ Reentrancy guards (if external calls)
- [ ] ✅ Input validation in performUpkeep
- [ ] ✅ Condition revalidation in performUpkeep
- [ ] ✅ Access controls (if needed)
- [ ] ✅ Tested on testnet first

## 🎯 Interface Requirements

Your contract MUST implement:

```solidity
function checkUpkeep(bytes calldata checkData)
    external
    view
    returns (bool upkeepNeeded, bytes memory performData);

function performUpkeep(bytes calldata performData)
    external;
```

## 📱 Support Contacts

- **Discord:** https://discord.gg/chainlink
- **Docs:** https://docs.chain.link/chainlink-automation
- **Status:** https://status.chain.link/
- **GitHub:** https://github.com/smartcontractkit/chainlink

## 🎓 Next Steps

After successful deployment:

1. **Monitor** upkeep executions in dashboard
2. **Set alerts** for low LINK balance
3. **Optimize** gas usage if needed
4. **Scale** to mainnet when ready
5. **Integrate** with your dApp

---

**Pro Tip:** Always test on Sepolia with small intervals first, then increase for production!

