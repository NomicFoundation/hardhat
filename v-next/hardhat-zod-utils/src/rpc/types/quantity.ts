import type { ZodType } from "zod";

import { z } from "zod";

import { conditionalUnionType } from "@nomicfoundation/hardhat-zod-utils";

import { isRpcQuantityString } from "../utils.js";

export const rpcQuantity: ZodType<bigint> = conditionalUnionType(
  [
    [(data) => typeof data === "bigint", z.bigint()],
    [isRpcQuantityString, z.string()],
  ],
  "Expected a bigint or a valid RPC quantity string",
).transform((v) => (typeof v === "string" ? BigInt(v) : v));
