/**
 * Grove Storage REST client (Base mainnet, chain_id=8453).
 * @see https://docs.grove.storage/
 */

export const GROVE_CHAIN_ID = '8453';
export const GROVE_API_BASE = 'https://api.grove.storage';

export type GroveUploadResult = {
  storageKey: string;
  gatewayUrl: string;
  uri: string;
};

type GroveUploadResponse = {
  storage_key?: string;
  gateway_url?: string;
  uri?: string;
  storageKey?: string;
  gatewayUrl?: string;
};

const normalizeUploadResponse = (
  data: GroveUploadResponse,
): GroveUploadResult | null => {
  const storageKey = data.storageKey ?? data.storage_key;
  const gatewayUrl = data.gatewayUrl ?? data.gateway_url;
  const uri = data.uri;

  if (!storageKey || !gatewayUrl) {
    return null;
  }

  return {
    storageKey,
    gatewayUrl,
    uri: uri ?? `lens://${storageKey}`,
  };
};

export const uploadFileToGrove = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType = 'audio/mpeg',
): Promise<GroveUploadResult> => {
  const url = `${GROVE_API_BASE}/?chain_id=${GROVE_CHAIN_ID}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(fileBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grove upload failed (${response.status}): ${errorText}`);
  }

  const raw = (await response.json()) as GroveUploadResponse | GroveUploadResponse[];
  const entry = Array.isArray(raw) ? raw[0] : raw;
  const normalized = entry ? normalizeUploadResponse(entry) : null;

  if (!normalized) {
    throw new Error(`Grove upload returned unexpected response for ${fileName}`);
  }

  return normalized;
};
