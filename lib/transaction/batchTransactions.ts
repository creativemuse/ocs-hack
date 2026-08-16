import { Interface } from 'ethers';
import { base } from 'viem/chains';
import { numberToHex } from 'viem';
import { getBaseAccountProvider } from '@/lib/base-account/sdk';
import {
  extractCallsId,
  pollBatchCallsStatus,
  type SendCallsResult,
} from '@/lib/base-account/batchCalls';
import { BUILDER_CODE_DATA_SUFFIX } from '@/lib/blockchain/builderCode';

export interface BatchCall {
  to: string;
  data: string;
  value?: string;
}

export interface BatchTransactionOptions {
  from: string;
  calls: BatchCall[];
  atomicRequired?: boolean;
  gasless?: boolean;
}

export interface BatchTransactionResult {
  transactionHash: string;
  success: boolean;
  error?: string;
}

/**
 * Sends multiple onchain calls in a single transaction using wallet_sendCalls
 * @param options Configuration for the batch transaction
 * @returns Promise with transaction result
 */
export async function sendBatchCalls(options: BatchTransactionOptions): Promise<BatchTransactionResult> {
  const provider = getBaseAccountProvider();
  const { from, calls, atomicRequired = true, gasless = true } = options;

  if (!calls || calls.length === 0) {
    throw new Error('No calls provided for batch transaction');
  }

  try {
    console.log(`Sending batch transaction with ${calls.length} calls...`);
    console.log('Calls:', calls.map(call => ({
      to: call.to,
      dataLength: call.data.length,
      value: call.value || '0'
    })));

    const sendCallsResult = await provider.request({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '2.0.0',
          from,
          chainId: numberToHex(base.id),
          atomicRequired,
          calls: calls.map((call) => ({
            to: call.to,
            data: call.data,
            value: call.value || '0x0',
          })),
          ...(gasless
            ? {
                capabilities: {
                  dataSuffix: { value: BUILDER_CODE_DATA_SUFFIX, optional: true },
                },
              }
            : {}),
        },
      ],
    });

    const callsId = extractCallsId(sendCallsResult as SendCallsResult);

    if (!callsId || typeof callsId !== 'string') {
      throw new Error('wallet_sendCalls did not return a callsId');
    }

    console.log('Batch submitted, callsId:', callsId);

    const transactionHash = (await pollBatchCallsStatus(provider, callsId)) ?? '';

    return {
      transactionHash,
      success: Boolean(transactionHash),
      ...(transactionHash ? {} : { error: 'Batch completed without a transaction hash' }),
    };

  } catch (error) {
    console.error('Batch transaction failed:', error);
    
    return {
      transactionHash: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Creates a batch transaction for game actions (e.g., multiple rounds)
 * @param gameActions Array of game action calls
 * @param options Additional batch transaction options
 * @returns Promise with transaction result
 */
export async function sendGameBatchCalls(
  gameActions: BatchCall[],
  options: Omit<BatchTransactionOptions, 'calls'>
): Promise<BatchTransactionResult> {
  return sendBatchCalls({
    calls: gameActions,
    atomicRequired: true, // All game actions must succeed or all fail
    gasless: true, // Use paymaster for gasless transactions
    ...options
  });
}

/**
 * Creates a batch transaction for spend permission + game entry
 * @param spendPermissionCall Call to grant spend permission
 * @param gameEntryCall Call to join the game
 * @param options Additional batch transaction options
 * @returns Promise with transaction result
 */
export async function sendSpendPermissionAndGameEntry(
  spendPermissionCall: BatchCall,
  gameEntryCall: BatchCall,
  options: Omit<BatchTransactionOptions, 'calls'>
): Promise<BatchTransactionResult> {
  return sendBatchCalls({
    calls: [spendPermissionCall, gameEntryCall],
    atomicRequired: true, // Both permission and entry must succeed
    gasless: true,
    ...options
  });
}

/**
 * Creates a batch transaction for multiple game rounds
 * @param gameRoundCalls Array of game round calls
 * @param options Additional batch transaction options
 * @returns Promise with transaction result
 */
export async function sendMultipleGameRounds(
  gameRoundCalls: BatchCall[],
  options: Omit<BatchTransactionOptions, 'calls'>
): Promise<BatchTransactionResult> {
  if (gameRoundCalls.length === 0) {
    throw new Error('No game round calls provided');
  }

  if (gameRoundCalls.length > 10) {
    throw new Error('Too many game rounds in single batch (max 10)');
  }

  return sendBatchCalls({
    calls: gameRoundCalls,
    atomicRequired: true, // All rounds must succeed or all fail
    gasless: true,
    ...options
  });
}

/**
 * Creates a batch transaction for funding + spend permission + game entry
 * @param fundingCall Call to transfer funds from universal to sub account
 * @param spendPermissionCall Call to grant spend permission
 * @param gameEntryCall Call to join the game
 * @param options Additional batch transaction options
 * @returns Promise with transaction result
 */
export async function sendCompleteGameSetup(
  fundingCall: BatchCall,
  spendPermissionCall: BatchCall,
  gameEntryCall: BatchCall,
  options: Omit<BatchTransactionOptions, 'calls'>
): Promise<BatchTransactionResult> {
  return sendBatchCalls({
    calls: [fundingCall, spendPermissionCall, gameEntryCall],
    atomicRequired: true, // All setup steps must succeed
    gasless: true,
    ...options
  });
}

/**
 * Utility to create a simple call object
 * @param to Contract address
 * @param data Encoded function call data
 * @param value ETH value to send (optional)
 * @returns BatchCall object
 */
export function createCall(to: string, data: string, value?: string): BatchCall {
  return {
    to,
    data,
    value: value || '0'
  };
}

/**
 * Utility to create an ERC20 approval call
 * @param tokenAddress ERC20 token contract address
 * @param spenderAddress Address to approve
 * @param amount Amount to approve (in wei)
 * @returns BatchCall object
 */
export function createERC20ApprovalCall(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): BatchCall {
  const iface = new Interface([
    'function approve(address spender, uint256 amount) returns (bool)'
  ]);
  
  const data = iface.encodeFunctionData('approve', [spenderAddress, amount]);
  
  return createCall(tokenAddress, data);
}

/**
 * Utility to create a game entry call
 * @param gameContractAddress Game contract address
 * @param entryFee Entry fee amount
 * @returns BatchCall object
 */
export function createGameEntryCall(
  gameContractAddress: string,
  entryFee: string
): BatchCall {
  const iface = new Interface([
    'function joinBattle() payable'
  ]);
  
  const data = iface.encodeFunctionData('joinBattle');
  
  return createCall(gameContractAddress, data, entryFee);
}

/**
 * Utility to create a USDC transfer call
 * @param usdcAddress USDC contract address
 * @param toAddress Recipient address
 * @param amount Amount to transfer (in wei)
 * @returns BatchCall object
 */
export function createUSDCTransferCall(
  usdcAddress: string,
  toAddress: string,
  amount: string
): BatchCall {
  const iface = new Interface([
    'function transfer(address to, uint256 amount) returns (bool)'
  ]);
  
  const data = iface.encodeFunctionData('transfer', [toAddress, amount]);
  
  return createCall(usdcAddress, data);
}
