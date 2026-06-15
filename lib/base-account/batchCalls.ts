import { base } from 'viem/chains';
import { numberToHex, type Hex } from 'viem';
import { BUILDER_CODE_DATA_SUFFIX } from '@/lib/blockchain/builderCode';

export type BatchCallInput = {
  to: `0x${string}`;
  value: `0x${string}`;
  data: `0x${string}`;
};

type WalletProvider = {
  request: (args: {
    method: string;
    params?: object | readonly unknown[] | undefined;
  }) => Promise<unknown>;
};

type CapabilitiesMap = Record<
  string,
  {
    atomicBatch?: { supported?: boolean };
  }
>;

type CallsStatusResult = {
  status?: number | string;
  receipts?: Array<{ transactionHash?: string }>;
};

const BATCH_POLL_INTERVAL_MS = 2_000;
const BATCH_POLL_TIMEOUT_MS = 180_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const supportsAtomicBatch = async (
  provider: WalletProvider,
  address: string
): Promise<boolean> => {
  try {
    const capabilities = (await provider.request({
      method: 'wallet_getCapabilities',
      params: [address],
    })) as CapabilitiesMap;
    const chainKey = numberToHex(base.id);
    return Boolean(capabilities?.[chainKey]?.atomicBatch?.supported);
  } catch {
    return false;
  }
};

const extractLastTxHash = (status: CallsStatusResult): string | undefined => {
  const receipts = status.receipts;
  if (!receipts?.length) return undefined;
  const last = receipts[receipts.length - 1];
  return last?.transactionHash;
};

const isBatchConfirmed = (status: CallsStatusResult): boolean => {
  const s = status.status;
  return s === 200 || s === 'CONFIRMED' || s === 'confirmed';
};

const isBatchFailed = (status: CallsStatusResult): boolean => {
  const s = status.status;
  if (!s || s === 100 || s === 'PENDING' || s === 'pending') return false;
  return !isBatchConfirmed(status);
};

export const pollBatchCallsStatus = async (
  provider: WalletProvider,
  callsId: string
): Promise<string | undefined> => {
  const deadline = Date.now() + BATCH_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const status = (await provider.request({
        method: 'wallet_getCallsStatus',
        params: [callsId],
      })) as CallsStatusResult;

      if (isBatchConfirmed(status)) {
        return extractLastTxHash(status);
      }
      if (isBatchFailed(status)) {
        throw new Error('Batch transaction reverted on-chain');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('reverted')) {
        throw err;
      }
      // Temporary polling errors — retry until timeout
    }

    await sleep(BATCH_POLL_INTERVAL_MS);
  }

  throw new Error('Batch transaction timed out waiting for confirmation');
};

export const sendAtomicBatchCalls = async (
  provider: WalletProvider,
  from: string,
  calls: BatchCallInput[]
): Promise<string | undefined> => {
  const batchCalls = calls.map((call) => ({
    to: call.to,
    value: call.value ?? '0x0',
    data: call.data,
  }));

  const callsId = (await provider.request({
    method: 'wallet_sendCalls',
    params: [
      {
        version: '2.0.0',
        from,
        chainId: numberToHex(base.id),
        atomicRequired: true,
        calls: batchCalls,
        capabilities: {
          dataSuffix: { value: BUILDER_CODE_DATA_SUFFIX, optional: true },
        },
      },
    ],
  })) as string;

  if (!callsId || typeof callsId !== 'string') {
    throw new Error('wallet_sendCalls did not return a callsId');
  }

  return pollBatchCallsStatus(provider, callsId);
};

export const sendSequentialTransactions = async (
  provider: WalletProvider,
  from: string,
  calls: BatchCallInput[],
  waitForReceipt: (hash: Hex) => Promise<{ status: string }>
): Promise<string | undefined> => {
  const results: string[] = [];

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const result = (await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: call.to,
          value: call.value,
          data: call.data,
          chainId: numberToHex(base.id),
        },
      ],
    })) as Hex;

    results.push(result);

    const receipt = await waitForReceipt(result);
    if (receipt.status !== 'success') {
      throw new Error(
        `Transaction ${i + 1} of ${calls.length} reverted on-chain. Try again in a moment.`
      );
    }
  }

  return results.length > 0 ? results[results.length - 1] : undefined;
};
