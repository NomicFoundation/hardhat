import type {
  HardhatUserConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkHDAccountsUserConfig,
  NetworkConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { getUnprefixedHexString } from "@ignored/hardhat-vnext-utils/hex";
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

const chainTypeSchema = unionType(
  [z.literal("l1"), z.literal("optimism"), z.literal("generic")],
  "Expected 'l1', 'optimism', or 'generic'",
);

const userGasSchema = unionType(
  [
    z.literal("auto"),
    z.number().int().positive().safe(),
    z.bigint().positive(),
  ],
  "Expected 'auto', a positive safe int, or positive bigint",
);

const accountsPrivateKeySchema = unionType(
  [
    configurationVariableSchema,
    z
      .string()
      .refine((val) => getUnprefixedHexString(val).length === 64)
      .refine((val) => /^[0-9a-fA-F]+$/.test(getUnprefixedHexString(val))),
  ],
  `Expected a hex-encoded private key or a Configuration Variable`,
);

// TODO: We don't support config variables in EDR networks yet
const edrPrivateKeySchemaMessage = `Expected a hex-encoded private key`;
const edrPrivateKeySchema = z
  .string()
  .refine(
    (val) =>
      getUnprefixedHexString(val).length === 64 &&
      /^[0-9a-fA-F]+$/.test(getUnprefixedHexString(val)),
    { message: edrPrivateKeySchemaMessage },
  );

const httpNetworkHDAccountsUserConfig = z.object({
  mnemonic: z.string(),
  initialIndex: z.optional(z.number().int()),
  count: z.optional(z.number().int().positive()),
  path: z.optional(z.string()),
  passphrase: z.optional(z.string()),
});

const httpNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [(data) => Array.isArray(data), z.array(accountsPrivateKeySchema)],
    [isObject, httpNetworkHDAccountsUserConfig],
  ],
  `Expected 'remote', an array with private keys or Configuration Variables, or an object with HD account details`,
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
  url: z.string().url(), // TODO: this should be a sensitiveUrlSchema
  timeout: z.optional(z.number()),
  httpHeaders: z.optional(z.record(z.string())),
});

const edrNetworkUserConfigAccountSchema = z.object({
  privateKey: edrPrivateKeySchema,
  balance: unionType(
    [z.string(), z.bigint().positive()],
    "Expected a string or a positive bigint",
  ),
});

const edrNetworkHDAccountsUserConfig = z.object({
  mnemonic: z.optional(z.string()),
  initialIndex: z.optional(z.number().int()),
  count: z.optional(z.number().int().positive()),
  path: z.optional(z.string()),
  accountsBalance: unionType(
    [z.string(), z.bigint().positive()],
    "Expected a string or a positive bigint",
  ).optional(),
  passphrase: z.optional(z.string()),
});

const edrNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [(data) => Array.isArray(data), z.array(edrNetworkUserConfigAccountSchema)],
    [isObject, edrNetworkHDAccountsUserConfig],
  ],
  `Expected an array with with objects with private key and balance or Configuration Variables, or an object with HD account details`,
);

const edrNetworkUserConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int().optional(),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()).optional(),
  gas: userGasSchema.optional(),
  gasMultiplier: z.number().optional(),
  gasPrice: userGasSchema.optional(),
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

const gasSchema = unionType(
  [z.literal("auto"), z.bigint().positive()],
  "Expected 'auto' or positive bigint",
);

const httpNetworkHDAccountsConfig = z.object({
  mnemonic: z.string(),
  initialIndex: z.number().int(),
  count: z.number().int().positive(),
  path: z.string(),
  passphrase: z.string(),
});

const httpNetworkAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) => Array.isArray(data),
      z.array(resolvedConfigurationVariableSchema),
    ],
    [isObject, httpNetworkHDAccountsConfig],
  ],
  `Expected 'remote', an array with of ResolvedConfigurationVariables, or an object with HD account details`,
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

const edrNetworkAccountSchema = z.object({
  privateKey: edrPrivateKeySchema,
  balance: z.bigint().positive(),
});

const edrNetworkHDAccountsConfig = z.object({
  mnemonic: z.string(),
  initialIndex: z.number().int(),
  count: z.number().int().positive(),
  path: z.string(),
  accountsBalance: z.bigint(),
  passphrase: z.string(),
});

const edrNetworkAccountsSchema = conditionalUnionType(
  [
    [(data) => Array.isArray(data), z.array(edrNetworkAccountSchema)],
    [isObject, edrNetworkHDAccountsConfig],
  ],
  `Expected an array with with objects with private key and balance, or an object with HD account details`,
);

const edrNetworkConfigSchema = z.object({
  type: z.literal("edr"),
  chainId: z.number().int(),
  chainType: z.optional(chainTypeSchema),
  from: z.optional(z.string()),
  gas: gasSchema,
  gasMultiplier: z.number(),
  gasPrice: gasSchema,
  // TODO: make this required and resolve the accounts in the config hook handler
  accounts: z.optional(edrNetworkAccountsSchema),
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

export function isHdAccountsConfig(
  accounts: HttpNetworkAccountsUserConfig,
): accounts is HttpNetworkHDAccountsUserConfig {
  return isObject(accounts);
}
