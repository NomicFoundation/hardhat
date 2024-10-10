import type {
  HardhatUserConfig,
  NetworkConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { isPrivateKey } from "@ignored/hardhat-vnext-utils/eth";
import {
  conditionalUnionType,
  sensitiveUrlSchema,
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

const privateKeySchema = z.string().refine((val) => isPrivateKey(val), {
  message: "The private key must be a valid private key",
});

const httpNetworkUserConfigAccountsSchema = unionType(
  [
    z.literal("remote"),
    z.array(privateKeySchema),
    z.object({
      mnemonic: z.string(),
      initialIndex: z.optional(z.number().int()),
      count: z.optional(z.number().int().positive()),
      path: z.optional(z.string()),
      passphrase: z.optional(z.string()),
    }),
  ],
  "Expected 'remote', an array of strings, or an object with optional mnemonic and account details",
);

const httpNetworkUserConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: z.optional(userGasSchema),
  gasMultiplier: z.optional(z.number()),
  gasPrice: z.optional(userGasSchema),
  accounts: z.optional(httpNetworkUserConfigAccountsSchema),

  // HTTP network specific
  url: sensitiveUrlSchema,
  timeout: z.optional(z.number()),
  httpHeaders: z.optional(z.record(z.string())),
});

const edrNetworkUserConfigAccountsSchema = unionType(
  [
    z.array(
      z.object({
        privateKey: privateKeySchema,
        balance: z.string(),
      }),
    ),
    z.object({
      mnemonic: z.optional(z.string()),
      initialIndex: z.optional(z.number().int()),
      count: z.optional(z.number().int().positive()),
      path: z.optional(z.string()),
      accountsBalance: z.optional(z.string()),
      passphrase: z.optional(z.string()),
    }),
  ],
  "Expected an array of objects with 'privateKey' and 'balance', or an object with optional mnemonic and account details",
);

const edrNetworkUserConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: userGasSchema,
  gasMultiplier: z.number(),
  gasPrice: userGasSchema,
  accounts: z.optional(edrNetworkUserConfigAccountsSchema),
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

const httpNetworkAccountsSchema = unionType(
  [
    z.literal("remote"),
    z.array(privateKeySchema),
    z.object({
      mnemonic: z.string(),
      initialIndex: z.number().int(),
      count: z.number().int().positive(),
      path: z.string(),
      passphrase: z.string(),
    }),
  ],
  "Expected 'remote', an array of strings, or an object with account details",
);

const httpNetworkConfigSchema = z.object({
  type: z.literal("http"),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: gasSchema,
  gasMultiplier: z.number(),
  gasPrice: gasSchema,
  accounts: httpNetworkAccountsSchema,

  // HTTP network specific
  url: sensitiveUrlSchema,
  timeout: z.number(),
  httpHeaders: z.record(z.string()),
});

const edrNetworkAccountsSchema = unionType(
  [
    z.array(
      z.object({
        privateKey: privateKeySchema,
        balance: z.string(),
      }),
    ),
    z.object({
      mnemonic: z.string(),
      initialIndex: z.number().int(),
      count: z.number().int().positive(),
      path: z.string(),
      accountsBalance: z.string(),
      passphrase: z.string(),
    }),
  ],
  "Expected an array of objects with 'privateKey' and 'balance', or an object with mnemonic and account details",
);

const edrNetworkConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.string(),
  gas: gasSchema,
  gasMultiplier: z.number(),
  gasPrice: gasSchema,
  accounts: edrNetworkAccountsSchema,
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
