import {
  spacetimeClient,
  type SpacetimeInitOptions,
} from '@/lib/apis/spacetime';

export type TryInitializeSpacetimeResult = {
  ok: boolean;
  configured: boolean;
  error?: string;
};

export const tryInitializeSpacetime = async (
  options?: SpacetimeInitOptions,
): Promise<TryInitializeSpacetimeResult> => {
  try {
    await spacetimeClient.initialize(options);
    const configured = spacetimeClient.isConfigured();
    return { ok: configured, configured };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️ SpacetimeDB initialization failed (non-fatal):', message);
    return {
      ok: false,
      configured: spacetimeClient.isConfigured(),
      error: message,
    };
  }
};

export const ensureTrialDataReady = async (): Promise<TryInitializeSpacetimeResult> => {
  try {
    await spacetimeClient.ensureTrialDataReady();
    return { ok: spacetimeClient.isConfigured(), configured: spacetimeClient.isConfigured() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync timeout';
    console.warn('⚠️ SpacetimeDB trial data sync failed:', message);
    return {
      ok: false,
      configured: spacetimeClient.isConfigured(),
      error: message,
    };
  }
};

const isSpacetimeEnvConfigured = (): boolean =>
  !!(
    (process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST) &&
    (process.env.SPACETIME_MODULE || process.env.NEXT_PUBLIC_SPACETIME_MODULE)
  );

/** Bounded Spacetime probe for lightweight health routes (e.g. env-check). */
export const probeSpacetimeConnection = async (
  timeoutMs = 5000,
): Promise<TryInitializeSpacetimeResult> => {
  if (spacetimeClient.isConfigured()) {
    return { ok: true, configured: true };
  }

  if (!isSpacetimeEnvConfigured()) {
    return { ok: false, configured: false, error: 'SpacetimeDB not configured' };
  }

  return Promise.race([
    tryInitializeSpacetime(),
    new Promise<TryInitializeSpacetimeResult>((resolve) =>
      setTimeout(() => {
        const configured = spacetimeClient.isConfigured();
        resolve({
          ok: configured,
          configured,
          error: configured
            ? undefined
            : `SpacetimeDB connection probe timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs),
    ),
  ]);
};
