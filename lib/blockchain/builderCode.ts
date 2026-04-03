import { type Hex, stringToHex } from 'viem';

// Base Builder Code (ERC-8021 transaction attribution)
// Derived from env var with fallback to default code
const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE || 'bc_5l04cy7v';
const BUILDER_CODE_HEX = stringToHex(BUILDER_CODE).slice(2);
const ERC8021_MARKER = '80218021802180218021802180218021';

export const BUILDER_CODE_DATA_SUFFIX: Hex = `0x${BUILDER_CODE_HEX}${ERC8021_MARKER}` as Hex;

/**
 * Appends the ERC-8021 builder code suffix to transaction calldata.
 * The suffix is ignored by the EVM and read by offchain indexers.
 */
export function appendBuilderCode(data: Hex | undefined): Hex {
  const calldata = data ?? '0x';
  return `${calldata}${BUILDER_CODE_DATA_SUFFIX.slice(2)}` as Hex;
}
