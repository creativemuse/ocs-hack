import { createOrbLogin } from '@orbclub/modules/auth';
import { getLensAccountFromAccessToken } from '@orbclub/modules/auth/lens';
import { resolveLensMediaUrl } from '@/lib/identity/resolveLensMedia';
import type { LensProfile } from '@/lib/orb/types';

const DEFAULT_LENS_GRAPHQL_URL =
  process.env.LENS_GRAPHQL_URL ?? 'https://api.lens.xyz/graphql';

type LensGraphQlAccount = {
  address?: string;
  username?: { localName?: string | null } | null;
  metadata?: {
    displayName?: string | null;
    picture?: string | null;
  } | null;
};

type LensMeResponse = {
  data?: {
    me?: {
      loggedInAs?: {
        __typename?: string;
        account?: LensGraphQlAccount | null;
      } | null;
    } | null;
  } | null;
  errors?: Array<{ message?: string }>;
};

const ME_QUERY = `
  query Me {
    me {
      loggedInAs {
        ... on AccountManaged {
          account {
            address
            username {
              localName
            }
            metadata {
              displayName
              picture
            }
          }
        }
        ... on AccountOwner {
          account {
            address
            username {
              localName
            }
            metadata {
              displayName
              picture
            }
          }
        }
      }
    }
  }
`;

export const fetchLensProfileFromAccessToken = async (
  accessToken: string,
): Promise<LensProfile | null> => {
  const lensAccountId = getLensAccountFromAccessToken(accessToken);
  if (!lensAccountId) {
    return null;
  }

  const response = await fetch(DEFAULT_LENS_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: ME_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Lens GraphQL failed (${response.status})`);
  }

  const payload = (await response.json()) as LensMeResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Lens GraphQL error');
  }

  const account = payload.data?.me?.loggedInAs?.account;
  const handle = account?.username?.localName?.trim();
  if (!handle) {
    return {
      lensAccountId,
      handle: lensAccountId.slice(0, 8),
      displayName: account?.metadata?.displayName ?? undefined,
      avatarUri: account?.metadata?.picture ?? undefined,
      avatarUrl: resolveLensMediaUrl(account?.metadata?.picture) ?? undefined,
    };
  }

  const avatarUri = account?.metadata?.picture ?? undefined;
  return {
    lensAccountId: account?.address ?? lensAccountId,
    handle,
    displayName: account?.metadata?.displayName ?? undefined,
    avatarUri,
    avatarUrl: resolveLensMediaUrl(avatarUri) ?? undefined,
  };
};

export const verifyOrbAccessToken = async (
  accessToken: string,
): Promise<LensProfile> => {
  const profile = await fetchLensProfileFromAccessToken(accessToken);
  if (!profile) {
    throw new Error('Invalid or expired Orb/Lens session');
  }
  return profile;
};

export const refreshOrbAccessToken = async (
  refreshToken: string,
): Promise<string> => {
  const orb = createOrbLogin();
  const refreshed = await orb.refresh({ refreshToken });
  if (!refreshed.accessToken) {
    throw new Error('Failed to refresh Lens session');
  }
  return refreshed.accessToken;
};
