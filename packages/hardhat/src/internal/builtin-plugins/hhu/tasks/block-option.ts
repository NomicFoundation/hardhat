// The --block option parsed by `parseBlockArgument`. It's apart from block.ts
// because task definitions should only import constants.
export const BLOCK_OPTION = {
  name: "block",
  description:
    "The block whose state to use: a number, a hash, latest, pending, earliest, safe or finalized",
  defaultValue: "latest",
} as const;
