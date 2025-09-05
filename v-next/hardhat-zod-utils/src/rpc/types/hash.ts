import type { ZodType } from "zod";

import { isHash } from "@nomicfoundation/hardhat-utils/eth";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import { z } from "zod";

import { conditionalUnionType } from "@nomicfoundation/hardhat-zod-utils";

const HASH_LENGTH_BYTES = 32;

export const rpcHash: ZodType<Uint8Array> = conditionalUnionType(
  [
    [
      (data) => Buffer.isBuffer(data) && data.length === HASH_LENGTH_BYTES,
      z.instanceof(Uint8Array),
    ],
    [isHash, z.string()],
  ],
  "Expected a Buffer with the correct length or a valid RPC hash string",
).transform((v) =>
  typeof v === "string" ? Buffer.from(hexStringToBytes(v)) : v,
);
