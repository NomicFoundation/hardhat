import type { ZodType } from "zod";

import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import { conditionalUnionType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const ADDRESS_LENGTH_BYTES = 20;

export const rpcAddress: ZodType<Uint8Array> = conditionalUnionType(
  [
    [
      (data) => Buffer.isBuffer(data) && data.length === ADDRESS_LENGTH_BYTES,
      z.instanceof(Uint8Array),
    ],
    [isAddress, z.string()],
  ],
  "Expected a Buffer with correct length or a valid RPC address string",
).transform((v) => (typeof v === "string" ? hexStringToBytes(v) : v));

export const nullableRpcAddress: ZodType<Uint8Array | null> = rpcAddress
  .or(z.null())
  .describe(
    "Expected a Buffer with correct length, a valid RPC address string, or the null value",
  );
