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
  receipts?: CallsStatusReceipt | CallsStatusReceipt[];
};

const BATCH_POLL_INTERVAL_MS = 2_000;
const BATCH_POLL_TIMEOUT_MS = 180_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SendCallsResult =
  | string
  | {
      id?: unknown;
      batchId?: unknown;
      callsId?: unknown;
      result?: unknown;
    }
  | null
  | undefined;

type SendCallsObject = Exclude<SendCallsResult, string | null | undefined>;

type CallsStatusReceipt = {
  transactionHash?: string;
  status?: string;
};

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

const normalizeReceipts = (
  receipts: CallsStatusResult['receipts']
): CallsStatusReceipt[] => {
  if (!receipts) return [];
  return Array.isArray(receipts) ? receipts : [receipts];
};

export const extractCallsId = (result: SendCallsResult): string | undefined => {
  if (!result) return undefined;
  if (typeof result === 'string') return result;

  if (typeof result !== 'object') return undefined;

  const getStringValue = (
    source: SendCallsObject | undefined,
    key: keyof SendCallsObject
  ): string | undefined => {
    const value = source?.[key];
    return typeof value === 'string' ? value : undefined;
  };

  if (typeof result.result === 'string') return result.result;

  const innerResult =
    typeof result.result === 'object' && result.result !== null
      ? (result.result as SendCallsObject)
      : undefined;

  return (
    getStringValue(result, 'id') ??
    getStringValue(result, 'batchId') ??
    getStringValue(result, 'callsId') ??
    getStringValue(innerResult, 'id') ??
    getStringValue(innerResult, 'batchId') ??
    getStringValue(innerResult, 'callsId')
  );
};

const getNumericStatus = (status: CallsStatusResult['status']): number => {
  if (typeof status === 'number') return status;
  if (typeof status === 'string' && /^\d+$/.test(status.trim())) {
    return Number.parseInt(status, 10);
  }
  return Number.NaN;
};

const extractLastTxHash = (status: CallsStatusResult): string | undefined => {
  const receipts = status.receipts;
  const normalizedReceipts = normalizeReceipts(receipts);
  if (normalizedReceipts.length === 0) return undefined;
  const successfulReceipts = normalizedReceipts.filter((receipt) => receipt.status !== '0x0');
  const candidates = successfulReceipts.length > 0 ? successfulReceipts : normalizedReceipts;
  const last = candidates[candidates.length - 1];
  return last?.transactionHash;
};

const isBatchConfirmed = (status: CallsStatusResult): boolean => {
  const s = status.status;
  const numericStatus = getNumericStatus(s);
  if (!Number.isNaN(numericStatus)) return numericStatus >= 200 && numericStatus < 300;
  return s === 'CONFIRMED' || s === 'confirmed' || s === 'SUCCESS' || s === 'success';
};

const isBatchFailed = (status: CallsStatusResult): boolean => {
  const s = status.status;
  if (!s) return false;
  const numericStatus = getNumericStatus(s);
  if (!Number.isNaN(numericStatus)) return numericStatus < 100 || numericStatus >= 300;
  if (s === 'PENDING' || s === 'pending') return false;
  return !isBatchConfirmed(status);
};

const getBatchFailureMessage = (status: CallsStatusResult): string => {
  switch (getNumericStatus(status.status)) {
    case 400:
      return 'Batch transaction failed before being included on-chain';
    case 500:
      return 'Batch transaction reverted on-chain';
    case 600:
      return 'Batch transaction partially reverted on-chain';
    default:
      return `Batch transaction failed with status ${String(status.status)}`;
  }
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
        const txHash = extractLastTxHash(status);
        if (txHash) return txHash;
        // Some wallets report success before receipts are indexed. Keep polling for the hash.
      }
      if (isBatchFailed(status)) {
        throw new Error(getBatchFailureMessage(status));
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

  const result = (await provider.request({
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
  })) as SendCallsResult;

  const callsId = extractCallsId(result);

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
