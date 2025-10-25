# OCS Alpha - Blockchain Gaming Platform

This project combines blockchain gaming with automated smart contract functionality using Chainlink Automation.

## 📚 Documentation

### Deployment Guides
- **[Chainlink Automation Guide](docs/CHAINLINK_AUTOMATION_GUIDE.md)** - Complete guide for deploying automation-compatible contracts
- **[Quick Reference](docs/AUTOMATION_QUICK_REFERENCE.md)** - Quick commands and cheat sheet
- **[Foundry Deployment Guide](docs/FOUNDRY_DEPLOYMENT_GUIDE.md)** - General Foundry deployment instructions

### Quick Start: Deploy Automation Contract

```bash
# Deploy to Sepolia testnet
./deploy-automation-sepolia.sh 60

# Deploy to Ethereum mainnet
./deploy-automation-mainnet.sh 3600
```

Then register your upkeep at https://automation.chain.link/

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
