// CDP Configuration (client-side)
export const CDP_CONFIG = {
  // TriviaBattle Contract Configuration
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || "0x147d35009a1992c95bDa1C85Eea210c226aCEDd4",
  NETWORK: "base-mainnet",
  CONTRACT_NAME: "TriviaBattlev5",
  PROTOCOL_NAME: "public"
} as const;

// Client-side validation (always returns true since server handles the actual validation)
export const validateCDPConfig = (): boolean => {
  // Server-side validation happens in the API route
  // Client-side we assume it's available
  return true;
};
