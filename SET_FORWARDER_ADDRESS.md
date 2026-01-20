# ✅ Set Chainlink Forwarder Address on Contract

## 🔗 **Base Mainnet Forwarder Address**

**KeystoneForwarder Address (Base):** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`

This is the address that CRE workflows use to deliver reports to your contract. Your contract's `onReport()` function should only accept calls from this address.

---

## ⚙️ **Set Forwarder Address on Contract**

Your contract already has the `setChainlinkOracle()` function. Set the forwarder address:

```bash
cast send 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "setChainlinkOracle(address)" 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

---

## ✅ **Verify Forwarder is Set**

After setting, verify it's configured correctly:

```bash
cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "chainlinkOracle()" \
  --rpc-url base_mainnet
```

**Expected Output:** `0x000000000000000000000000F8344CFd5c43616a4366C34E3EEE75af79a74482`

---

## 🔒 **Security**

Your contract's `onReport()` function already includes this security check:

```solidity
function onReport(
    bytes calldata /* metadata */,
    bytes calldata report
) external {
    // Security: Verify caller is the Chainlink forwarder
    if (msg.sender != chainlinkOracle) {
        revert TriviaBattle__Unauthorized();
    }
    // ... rest of function
}
```

Once you set `chainlinkOracle` to `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`, only the CRE KeystoneForwarder will be able to call `onReport()`, which provides the first layer of security.

---

## 📋 **Forwarder Addresses (Reference)**

Here are forwarder addresses for all supported networks:

- **Base:** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` ✅ (Your network)
- **Arbitrum One:** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`
- **Avalanche:** `0x76c9cf548b4179F8901cda1f8623568b58215E62`
- **BNB Smart Chain:** `0x76c9cf548b4179F8901cda1f8623568b58215E62`
- **Ethereum Mainnet:** `0x0b93082D9b3C7C97fAcd250082899BAcf3af3885`
- **OP Mainnet:** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`
- **Polygon:** `0x76c9cf548b4179F8901cda1f8623568b58215E62`

---

## ✅ **After Setting Forwarder**

Once the forwarder is set:

1. ✅ Your CRE workflow can successfully call `distributePrizes()` via `onReport()`
2. ✅ The contract will reject any unauthorized calls to `onReport()`
3. ✅ Automated prize distribution will work on the next scheduled run (Sunday 00:00 UTC)

---

## 🎯 **Complete Setup Status**

- [x] Contract deployed to Base Mainnet
- [x] Contract has `onReport()` function
- [x] CRE workflow deployed and active
- [ ] **Set forwarder address on contract** ⚠️ **ACTION REQUIRED**
- [ ] Start first session to test

---

**Next Step:** Run the `cast send` command above to set the forwarder address! 🚀
