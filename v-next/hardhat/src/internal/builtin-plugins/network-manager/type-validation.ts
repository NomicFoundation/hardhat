import type {
  HardhatUserConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkHDAccountsUserConfig,
  NetworkConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import {
  getUnprefixedHexString,
  isHexString,
} from "@ignored/hardhat-vnext-utils/hex";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";
import {
  conditionalUnionType,
  configurationVariableSchema,
  resolvedConfigurationVariableSchema,
  sensitiveUrlSchema,
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const accountsPrivateKeyUserConfigSchema = unionType(
  [
    configurationVariableSchema,
    z
      .string()
      .refine(
        (val) => isHexString(val) && getUnprefixedHexString(val).length === 64,
      ),
  ],
  `Expected a hex-encoded private key or a Configuration Variable`,
);

const httpNetworkHDAccountsUserConfigSchema = z.object({
  mnemonic: z.string(),
  count: z.optional(z.number().int().positive()),
  initialIndex: z.optional(z.number().int()),
  passphrase: z.optional(z.string()),
  path: z.optional(z.string()),
});

const httpNetworkAccountsUserConfigSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) => Array.isArray(data),
      z.array(accountsPrivateKeyUserConfigSchema),
    ],
    [isObject, httpNetworkHDAccountsUserConfigSchema],
  ],
  `Expected 'remote', an array with private keys or Configuration Variables, or an object with HD account details`,
);

const chainTypeUserConfigSchema = unionType(
  [z.literal("l1"), z.literal("optimism"), z.literal("generic")],
  "Expected 'l1', 'optimism', or 'generic'",
);

const gasUserConfigSchema = unionType(
  [
    z.literal("auto"),
    z.number().int().positive().safe(),
    z.bigint().positive(),
  ],
  "Expected 'auto', a positive safe int, or positive bigint",
);

const httpNetworkUserConfigSchema = z.object({
  type: z.literal("http"),
  accounts: z.optional(httpNetworkAccountsUserConfigSchema),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeUserConfigSchema),
  from: z.optional(z.string()),
  gas: z.optional(gasUserConfigSchema),
  gasMultiplier: z.optional(z.number()),
  gasPrice: z.optional(gasUserConfigSchema),

  // HTTP network specific
  url: sensitiveUrlSchema,
  httpHeaders: z.optional(z.record(z.string())),
  timeout: z.optional(z.number()),
});

const edrNetworkAccountUserConfigSchema = z.object({
  balance: unionType(
    [z.string(), z.bigint().positive()],
    "Expected a string or a positive bigint",
  ),
  privateKey: accountsPrivateKeyUserConfigSchema,
});

const edrNetworkHDAccountsUserConfigSchema = z.object({
  mnemonic: z.optional(z.string()),
  accountsBalance: z.optional(
    unionType(
      [z.string(), z.bigint().positive()],
      "Expected a string or a positive bigint",
    ),
  ),
  count: z.optional(z.number().int().positive()),
  initialIndex: z.optional(z.number().int()),
  passphrase: z.optional(z.string()),
  path: z.optional(z.string()),
});

const edrNetworkAccountsUserConfigSchema = conditionalUnionType(
  [
    [(data) => Array.isArray(data), z.array(edrNetworkAccountUserConfigSchema)],
    [isObject, edrNetworkHDAccountsUserConfigSchema],
  ],
  `Expected an array with with objects with private key and balance or Configuration Variables, or an object with HD account details`,
);

const edrNetworkUserConfigSchema = z.object({
  type: z.literal("edr"),
  accounts: z.optional(edrNetworkAccountsUserConfigSchema),
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeUserConfigSchema),
  from: z.optional(z.string()),
  gas: z.optional(gasUserConfigSchema),
  gasMultiplier: z.optional(z.number()),
  gasPrice: z.optional(gasUserConfigSchema),

  // EDR network specific
  // TODO: add the rest of the fields
});

const networkUserConfigSchema = z.discriminatedUnion("type", [
  httpNetworkUserConfigSchema,
  edrNetworkUserConfigSchema,
]);

const userConfigSchema = z.object({
  defaultChainType: z.optional(chainTypeUserConfigSchema),
  defaultNetwork: z.optional(z.string()),
  networks: z.optional(z.record(networkUserConfigSchema)),
});

const chainTypeConfigSchema = unionType(
  [z.literal("l1"), z.literal("optimism"), z.literal("generic")],
  "Expected 'l1', 'optimism', or 'generic'",
);

const gasConfigSchema = unionType(
  [z.literal("auto"), z.bigint().positive()],
  "Expected 'auto' or positive bigint",
);

const httpNetworkHDAccountsConfigSchema = z.object({
  mnemonic: z.string(),
  count: z.number().int().positive(),
  initialIndex: z.number().int(),
  passphrase: z.string(),
  path: z.string(),
});

const httpNetworkAccountsConfigSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) => Array.isArray(data),
      z.array(resolvedConfigurationVariableSchema),
    ],
    [isObject, httpNetworkHDAccountsConfigSchema],
  ],
  `Expected 'remote', an array of ResolvedConfigurationVariables, or an object with HD account details`,
);

const httpNetworkConfigSchema = z.object({
  type: z.literal("http"),
  accounts: httpNetworkAccountsConfigSchema,
  chainId: z.optional(z.number().int()),
  chainType: z.optional(chainTypeConfigSchema),
  from: z.optional(z.string()),
  gas: gasConfigSchema,
  gasMultiplier: z.number(),
  gasPrice: gasConfigSchema,

  // HTTP network specific
  url: resolvedConfigurationVariableSchema,
  httpHeaders: z.record(z.string()),
  timeout: z.number(),
});

const edrNetworkAccountConfigSchema = z.object({
  balance: z.bigint().positive(),
  privateKey: resolvedConfigurationVariableSchema,
});

const edrNetworkHDAccountsConfig = z.object({
  mnemonic: z.string(),
  accountsBalance: z.bigint(),
  count: z.number().int().positive(),
  initialIndex: z.number().int(),
  passphrase: z.string(),
  path: z.string(),
});

const edrNetworkAccountsConfigSchema = conditionalUnionType(
  [
    [(data) => Array.isArray(data), z.array(edrNetworkAccountConfigSchema)],
    [isObject, edrNetworkHDAccountsConfig],
  ],
  `Expected an array with with objects with private key and balance, or an object with HD account details`,
);

const edrNetworkConfigSchema = z.object({
  type: z.literal("edr"),
  // TODO: make this required and resolve the accounts in the config hook handler
  accounts: z.optional(edrNetworkAccountsConfigSchema),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeConfigSchema),
  from: z.optional(z.string()),
  gas: gasConfigSchema,
  gasMultiplier: z.number(),
  gasPrice: gasConfigSchema,

  // EDR network specific
  // TODO: add the rest of the fields
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
): HardhatUserConfigValidationError[] {
  const result = networkConfigSchema.safeParse(networkConfig);
  return result.error?.errors ?? [];
}

export async function validateNetworkUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigSchema);
}

export function isHdAccountsUserConfig(
  accounts: HttpNetworkAccountsUserConfig,
): accounts is HttpNetworkHDAccountsUserConfig {
  return isObject(accounts);
}
