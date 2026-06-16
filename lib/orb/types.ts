export type OrbSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  authenticationId?: string;
  account?: string;
};

export type LensProfile = {
  lensAccountId: string;
  handle: string;
  displayName?: string;
  avatarUri?: string;
  avatarUrl?: string;
};

export const ORB_SESSION_STORAGE_KEY = 'beatme_orb_session';
