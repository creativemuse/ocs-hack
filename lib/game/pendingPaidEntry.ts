import type { PlayerModeChoice } from '@/types/game';

const STORAGE_KEY = 'bm_pending_paid_entry';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingPaidEntry = {
  paidTxHash: string;
  playerMode: PlayerModeChoice;
  walletAddress: string;
  walletUniversalAddress?: string;
  savedAt: number;
};

const normalizeAddress = (addr: string): string => {
  const trimmed = addr.trim();
  return trimmed.startsWith('0x') ? trimmed.toLowerCase() : `0x${trimmed}`.toLowerCase();
};

const getSessionStorage = (): Storage | null => {
  if (typeof globalThis === 'undefined') return null;
  try {
    return globalThis.sessionStorage ?? globalThis.window?.sessionStorage ?? null;
  } catch {
    return null;
  }
};

export const savePendingPaidEntry = (entry: Omit<PendingPaidEntry, 'savedAt'>): void => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const payload: PendingPaidEntry = { ...entry, savedAt: Date.now() };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
};

export const loadPendingPaidEntry = (
  walletAddress?: string | null
): PendingPaidEntry | null => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPaidEntry;
    if (!parsed?.paidTxHash || !parsed?.walletAddress) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearPendingPaidEntry();
      return null;
    }
    if (walletAddress) {
      const want = normalizeAddress(walletAddress);
      const have = normalizeAddress(parsed.walletAddress);
      if (want !== have) return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearPendingPaidEntry = (): void => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
