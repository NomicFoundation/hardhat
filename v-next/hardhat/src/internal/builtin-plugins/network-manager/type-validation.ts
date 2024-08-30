import type {
  HardhatUserConfig,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";
import type { HardhatUserConfigValidationError } from "@ignored/hardhat-vnext/types/hooks";

import {
  sensitiveUrlType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const chainTypeSchema = z.union([
  z.literal("l1"),
  z.literal("optimism"),
  z.literal("unknown"),
]);

const httpNetworkUserConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: z.optional(z.union([z.literal("auto"), z.number().int(), z.bigint()])),
  gasMultiplier: z.optional(z.number()),
  gasPrice: z.optional(
    z.union([z.literal("auto"), z.number().int(), z.bigint()]),
  ),

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
  gas: z.union([z.literal("auto"), z.number().int(), z.bigint()]),
  gasMultiplier: z.number(),
  gasPrice: z.union([z.literal("auto"), z.number().int(), z.bigint()]),
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

const httpNetworkConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: z.union([z.literal("auto"), z.bigint()]),
  gasMultiplier: z.number(),
  gasPrice: z.union([z.literal("auto"), z.bigint()]),

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
  gas: z.union([z.literal("auto"), z.bigint()]),
  gasMultiplier: z.number(),
  gasPrice: z.union([z.literal("auto"), z.bigint()]),
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

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigSchema);
}
