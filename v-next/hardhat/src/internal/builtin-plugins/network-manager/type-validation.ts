import type {
  HardhatUserConfig,
  NetworkConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import {
  conditionalUnionType,
  sensitiveUrlType,
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const chainTypeSchema = unionType(
  [z.literal("l1"), z.literal("optimism"), z.literal("unknown")],
  "Expected 'l1', 'optimism', or 'unknown'",
);

const userGasSchema = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.literal("auto")],
    [(data) => typeof data === "number", z.number().int().positive().safe()],
    [(data) => typeof data === "bigint", z.bigint().positive()],
  ],
  "Expected 'auto', a safe int, or bigint",
);

const httpNetworkUserConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: z.optional(userGasSchema),
  gasMultiplier: z.optional(z.number()),
  gasPrice: z.optional(userGasSchema),

  // HTTP network specific
  url: sensitiveUrlType,
  timeout: z.optional(z.number()),
  httpHeaders: z.optional(z.record(z.string())),
});

const edrNetworkUserConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: userGasSchema,
  gasMultiplier: z.number(),
  gasPrice: userGasSchema,
});

const networkUserConfigSchema = z.discriminatedUnion("type", [
  httpNetworkUserConfigSchema,
  edrNetworkUserConfigSchema,
]);

const userConfigSchema = z.object({
  defaultChainType: z.optional(chainTypeSchema),
  defaultNetwork: z.optional(z.string()),
  networks: z.optional(z.record(networkUserConfigSchema)),
});

const gasSchema = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.literal("auto")],
    [(data) => typeof data === "bigint", z.bigint().positive()],
  ],
  "Expected 'auto' or bigint",
);

const httpNetworkConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: gasSchema,
  gasMultiplier: z.number(),
  gasPrice: gasSchema,

  // HTTP network specific
  url: sensitiveUrlType,
  timeout: z.number(),
  httpHeaders: z.record(z.string()),
});

const edrNetworkConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.string(),
  gas: gasSchema,
  gasMultiplier: z.number(),
  gasPrice: gasSchema,
});

const networkConfigSchema = z.discriminatedUnion("type", [
  httpNetworkConfigSchema,
  edrNetworkConfigSchema,
]);

export function isNetworkConfig(
  networkConfig: unknown,
): networkConfig is NetworkConfig {
  const result = networkConfigSchema.safeParse(networkConfig);
  return result.success;
}

export function validateNetworkConfig(
  networkConfig: unknown,
): Array<{ message: string; path: Array<string | number> }> {
  const result = networkConfigSchema.safeParse(networkConfig);
  return result.error?.errors ?? [];
}

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigSchema);
}
