type RevokableProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

export const revokeProviderPermissions = async (
  provider: RevokableProvider | null | undefined
): Promise<void> => {
  if (!provider) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Best-effort; not all providers support revoke.
  }
};
