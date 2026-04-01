// CDP Configuration (client-side)
export const CDP_CONFIG = {
  // TriviaBattle Contract Configuration
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || "0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f",
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
