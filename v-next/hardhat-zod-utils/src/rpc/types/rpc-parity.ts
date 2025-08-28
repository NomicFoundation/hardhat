import type { ZodType } from "zod";

import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import { z } from "zod";

import { conditionalUnionType } from "@nomicfoundation/hardhat-zod-utils";

const PARITY_LENGTH_BYTES = 1;

export const rpcParity: ZodType<Buffer> = conditionalUnionType(
  [
    [
      (data) => Buffer.isBuffer(data) && data.length === PARITY_LENGTH_BYTES,
      z.instanceof(Uint8Array),
    ],
    [isRpcParityString, z.string()],
  ],
  "Expected a Buffer or valid parity string",
).transform((v) =>
  typeof v === "string" ? Buffer.from(hexStringToBytes(v)) : v,
);

function isRpcParityString(u: unknown): u is string {
  return typeof u === "string" && u.match(/^0x[0-9a-fA-F]{1,2}$/) !== null;
}
