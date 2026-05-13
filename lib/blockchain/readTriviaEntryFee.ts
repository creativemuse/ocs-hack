import { encodeFunctionData } from 'viem';
import type { PublicClient } from 'viem';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from './contracts';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export async function readTriviaEntryFeeWeiRpc(rpcUrl: string): Promise<bigint> {
  const data = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'entryFee',
    args: [],
  });
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
    }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) {
    throw new Error(json.error.message);
  }
  if (!json.result) {
    throw new Error('No result from entryFee() eth_call');
  }
  return BigInt(json.result);
}

export async function readTriviaEntryFeeWei(
  publicClient: Pick<PublicClient, 'readContract'>
): Promise<bigint> {
  const fee = await publicClient.readContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'entryFee',
  });
  return fee as bigint;
}

export async function readTriviaEntryFeeWeiFromProvider(
  provider: Eip1193Provider
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'entryFee',
    args: [],
  });
  const result = (await provider.request({
    method: 'eth_call',
    params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
  })) as string;
  return BigInt(result);
}
