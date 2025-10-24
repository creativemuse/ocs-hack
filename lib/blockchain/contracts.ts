// Entry fee in USDC (1 USDC = 1000000 wei for USDC with 6 decimals)
export const ENTRY_FEE_USDC = '1'; // 1 USDC
export const TRIAL_ENTRY_FEE_USDC = '0'; // 0 USDC for trial players

// USDC contract address on Base Mainnet
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// TriviaBattlev4 smart contract address (deployed on Base Mainnet)
// Updated with Chainlink Functions integration for decentralized rankings
// Compiled with Solidity 0.8.20 (no compiler warnings)
// Deployed: 2025-10-24 (with Chainlink Functions + Automation)
const TRIVIA_CONTRACT_ADDRESS = '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13';

// Import TriviaBattlev4 ABI
import { TRIVIABATTLEV4_ABI } from './triviabattlev4-abi';

// Contract ABI for trivia battle functionality (updated with Chainlink Functions integration)
export const TRIVIA_ABI = TRIVIABATTLEV4_ABI;

// Export contract addresses
export const TRIVIA_CONTRACT_ADDRESS_EXPORT = TRIVIA_CONTRACT_ADDRESS;
export const USDC_CONTRACT_ADDRESS_EXPORT = USDC_CONTRACT_ADDRESS;