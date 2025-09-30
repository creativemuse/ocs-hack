// CDP Configuration (client-side)
export const CDP_CONFIG = {
  // TriviaBattle Contract Configuration
  CONTRACT_ADDRESS: "0x231240B1d776a8F72785FE3707b74Ed9C3048B3a",
  NETWORK: "base-mainnet",
  CONTRACT_NAME: "TriviaBattle",
  PROTOCOL_NAME: "public"
} as const;

// Client-side validation (always returns true since server handles the actual validation)
export const validateCDPConfig = (): boolean => {
  // Server-side validation happens in the API route
  // Client-side we assume it's available
  return true;
};
