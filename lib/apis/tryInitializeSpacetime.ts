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
