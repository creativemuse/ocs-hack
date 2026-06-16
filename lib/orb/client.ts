'use client';

import { createOrbLogin } from '@orbclub/modules/auth';
import type { OrbLoginConfig } from '@orbclub/modules/auth';
import type { OrbSession } from './types';

let orbLoginSingleton: ReturnType<typeof createOrbLogin> | null = null;

export const getOrbLogin = (config?: OrbLoginConfig) => {
  if (!orbLoginSingleton) {
    orbLoginSingleton = createOrbLogin(config);
  }
  return orbLoginSingleton;
};

export const sessionFromQrResult = (result: {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  authenticationId?: string;
}): OrbSession => ({
  accessToken: result.accessToken,
  refreshToken: result.refreshToken,
  idToken: result.idToken,
  authenticationId: result.authenticationId,
});

export const enrichSessionWithAccount = (
  session: OrbSession,
  orb = getOrbLogin(),
): OrbSession => {
  const account = orb.getAccountFromAccessToken(session.accessToken) ?? undefined;
  return { ...session, account };
};
