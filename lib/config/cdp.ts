// CDP Configuration (client-side)
const isSepolia = process.env.NEXT_PUBLIC_NETWORK === 'sepolia';
export const CDP_CONFIG = {
  // TriviaBattlev5 Contract Configuration
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || (isSepolia ? "0x5B24440D7702BBc79BCAc7271C8EdE2a578aD0fB" : "0x76B356d0DCAe65942751A8F2Da2644a83d7f165f"),
  NETWORK: isSepolia ? "base-sepolia" : "base-mainnet",
  CONTRACT_NAME: "TriviaBattlev5",
  PROTOCOL_NAME: "public"
} as const;

// Client-side validation (always returns true since server handles the actual validation)
export const validateCDPConfig = (): boolean => {
  // Server-side validation happens in the API route
  // Client-side we assume it's available
  return true;
};
