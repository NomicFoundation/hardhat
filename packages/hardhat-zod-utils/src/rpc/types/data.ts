import type { ZodType } from "zod";

import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import { z } from "zod";

import { conditionalUnionType } from "@nomicfoundation/hardhat-zod-utils";

import { isRpcDataString } from "../utils.js";

export const rpcData: ZodType<Uint8Array> = conditionalUnionType(
  [
    [Buffer.isBuffer, z.instanceof(Uint8Array)],
    [isRpcDataString, z.string()],
  ],
  "Expected a Buffer or a valid RPC data string",
).transform((v) => (typeof v === "string" ? hexStringToBytes(v) : v));
