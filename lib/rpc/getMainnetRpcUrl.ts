/** Server-side Ethereum mainnet RPC for L1 ENS / basename resolution. */
export const getMainnetRpcUrl = (): string | null => {
  const direct = process.env.MAINNET_RPC_URL?.trim();
  if (direct) {
    return direct;
  }

  const serverAlchemy = process.env.ALCHEMY_API_KEY?.trim();
  if (serverAlchemy) {
    return `https://eth-mainnet.g.alchemy.com/v2/${serverAlchemy}`;
  }

  const publicAlchemy = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim();
  if (publicAlchemy) {
    return `https://eth-mainnet.g.alchemy.com/v2/${publicAlchemy}`;
  }

  return null;
};

export const hasMainnetRpc = (): boolean => getMainnetRpcUrl() !== null;
