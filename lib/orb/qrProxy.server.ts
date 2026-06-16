import { getSiteUrl } from '@/lib/config/site';

export const ORB_QR_INIT_URL = 'https://orbapi.xyz/init-sign-in';
export const ORB_QR_POLL_URL = 'https://orbapi.xyz/poll-sign-in';
export const ORB_QR_CREDENTIALS = 'id_access_refresh';

export const getOrbAppOrigin = (): string => getSiteUrl();

const getOrbProxyHeaders = (): Record<string, string> => {
  const origin = getOrbAppOrigin();
  return {
    Origin: origin,
    Referer: `${origin}/`,
  };
};

type OrbQrFetchInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export const orbQrFetch = async (
  url: string,
  init: OrbQrFetchInit = {},
): Promise<Response> => {
  const { headers, ...rest } = init;
  return fetch(url, {
    ...rest,
    headers: {
      ...getOrbProxyHeaders(),
      ...headers,
    },
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getOrbResponseStatus = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.status === 'string') {
    return payload.status;
  }

  const data = isRecord(payload.data) ? payload.data : undefined;
  if (typeof data?.status === 'string') {
    return data.status;
  }

  const nested = data && isRecord(data.data) ? data.data : undefined;
  if (typeof nested?.status === 'string') {
    return nested.status;
  }

  return undefined;
};

export const getOrbResponseMessage = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.msg === 'string' && payload.msg.trim()) {
    return payload.msg;
  }

  const data = isRecord(payload.data) ? payload.data : undefined;
  if (typeof data?.msg === 'string' && data.msg.trim()) {
    return data.msg;
  }

  return undefined;
};
