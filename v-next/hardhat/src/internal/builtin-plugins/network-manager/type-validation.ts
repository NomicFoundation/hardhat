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

import { HardforkName } from "./edr/types/hardfork.js";

const nonnegativeNumberSchema = z.number().nonnegative();
const nonnegativeIntSchema = z.number().int().nonnegative();
const nonnegativeBigIntSchema = z.bigint().nonnegative();

const blockNumberSchema = nonnegativeIntSchema;
const chainIdSchema = nonnegativeIntSchema;

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
  count: z.optional(nonnegativeIntSchema),
  initialIndex: z.optional(nonnegativeIntSchema),
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

const gasUnitUserConfigSchema = unionType(
  [nonnegativeIntSchema.safe(), nonnegativeBigIntSchema],
  "Expected a positive safe int or a positive bigint",
);

const gasUserConfigSchema = unionType(
  [z.literal("auto"), gasUnitUserConfigSchema],
  "Expected 'auto', a positive safe int, or positive bigint",
);

const httpNetworkUserConfigSchema = z.object({
  type: z.literal("http"),
  accounts: z.optional(httpNetworkAccountsUserConfigSchema),
  chainId: z.optional(chainIdSchema),
  chainType: z.optional(chainTypeUserConfigSchema),
  from: z.optional(z.string()),
  gas: z.optional(gasUserConfigSchema),
  gasMultiplier: z.optional(nonnegativeNumberSchema),
  gasPrice: z.optional(gasUserConfigSchema),

  // HTTP network specific
  url: sensitiveUrlSchema,
  httpHeaders: z.optional(z.record(z.string())),
  timeout: z.optional(nonnegativeNumberSchema),
});

const accountBalanceUserConfigSchema = unionType(
  [z.string(), nonnegativeBigIntSchema],
  "Expected a string or a positive bigint",
);

const edrNetworkAccountUserConfigSchema = z.object({
  balance: accountBalanceUserConfigSchema,
  privateKey: accountsPrivateKeyUserConfigSchema,
});

const edrNetworkHDAccountsUserConfigSchema = z.object({
  mnemonic: z.optional(z.string()),
  accountsBalance: z.optional(accountBalanceUserConfigSchema),
  count: z.optional(nonnegativeIntSchema),
  initialIndex: z.optional(nonnegativeIntSchema),
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

const hardforkHistoryUserConfig = z.map(z.string(), blockNumberSchema);

const edrNetworkChainUserConfigSchema = z.object({
  hardforkHistory: z.optional(hardforkHistoryUserConfig),
});

const edrNetworkChainsUserConfigSchema = z.map(
  chainIdSchema,
  edrNetworkChainUserConfigSchema,
);

const edrNetworkForkingUserConfig = z.object({
  enabled: z.optional(z.boolean()),
  url: sensitiveUrlSchema,
  blockNumber: z.optional(blockNumberSchema),
  httpHeaders: z.optional(z.record(z.string())),
});

const edrNetworkMempoolUserConfigSchema = z.object({
  order: z.optional(
    unionType(
      [z.literal("fifo"), z.literal("priority")],
      "Expected 'fifo' or 'priority'",
    ),
  ),
});

const edrNetworkMiningUserConfigSchema = z.object({
  auto: z.optional(z.boolean()),
  interval: z.optional(
    unionType(
      [
        nonnegativeIntSchema,
        z.tuple([nonnegativeIntSchema, nonnegativeIntSchema]),
      ],
      "Expected a number or an array of numbers",
    ),
  ),
  mempool: z.optional(edrNetworkMempoolUserConfigSchema),
});

const edrNetworkUserConfigSchema = z.object({
  type: z.literal("edr"),
  accounts: z.optional(edrNetworkAccountsUserConfigSchema),
  chainId: z.optional(chainIdSchema),
  chainType: z.optional(chainTypeUserConfigSchema),
  from: z.optional(z.string()),
  gas: z.optional(gasUserConfigSchema),
  gasMultiplier: z.optional(nonnegativeNumberSchema),
  gasPrice: z.optional(gasUserConfigSchema),

  // EDR network specific
  allowBlocksWithSameTimestamp: z.optional(z.boolean()),
  allowUnlimitedContractSize: z.optional(z.boolean()),
  blockGasLimit: z.optional(gasUnitUserConfigSchema),
  chains: z.optional(edrNetworkChainsUserConfigSchema),
  coinbase: z.optional(z.string()),
  enableRip7212: z.optional(z.boolean()),
  enableTransientStorage: z.optional(z.boolean()),
  forking: z.optional(edrNetworkForkingUserConfig),
  hardfork: z.optional(z.nativeEnum(HardforkName)),
  initialBaseFeePerGas: z.optional(gasUnitUserConfigSchema),
  initialDate: z.optional(
    unionType([z.string(), z.instanceof(Date)], "Expected a string or a Date"),
  ),
  loggingEnabled: z.optional(z.boolean()),
  minGasPrice: z.optional(gasUnitUserConfigSchema),
  mining: z.optional(edrNetworkMiningUserConfigSchema),
  networkId: z.optional(chainIdSchema),
  throwOnCallFailures: z.optional(z.boolean()),
  throwOnTransactionFailures: z.optional(z.boolean()),
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

const gasUnitConfigSchema = nonnegativeBigIntSchema;

const gasConfigSchema = unionType(
  [z.literal("auto"), gasUnitConfigSchema],
  "Expected 'auto' or positive bigint",
);

const httpNetworkHDAccountsConfigSchema = z.object({
  mnemonic: z.string(),
  count: nonnegativeIntSchema,
  initialIndex: nonnegativeIntSchema,
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
  chainId: z.optional(chainIdSchema),
  chainType: z.optional(chainTypeConfigSchema),
  from: z.optional(z.string()),
  gas: gasConfigSchema,
  gasMultiplier: nonnegativeNumberSchema,
  gasPrice: gasConfigSchema,

  // HTTP network specific
  url: resolvedConfigurationVariableSchema,
  httpHeaders: z.record(z.string()),
  timeout: nonnegativeNumberSchema,
});

const accountBalanceConfigSchema = nonnegativeBigIntSchema;

const edrNetworkAccountConfigSchema = z.object({
  balance: accountBalanceConfigSchema,
  privateKey: resolvedConfigurationVariableSchema,
});

const edrNetworkHDAccountsConfig = z.object({
  mnemonic: z.string(),
  accountsBalance: accountBalanceConfigSchema,
  count: nonnegativeIntSchema,
  initialIndex: nonnegativeIntSchema,
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

const hardforkHistoryConfig = z.map(z.string(), blockNumberSchema);

const edrNetworkChainConfigSchema = z.object({
  hardforkHistory: hardforkHistoryConfig,
});

const edrNetworkChainsConfigSchema = z.map(
  chainIdSchema,
  edrNetworkChainConfigSchema,
);

const edrNetworkForkingConfig = z.object({
  enabled: z.boolean(),
  url: resolvedConfigurationVariableSchema,
  cacheDir: z.string(),
  blockNumber: z.optional(blockNumberSchema),
  httpHeaders: z.optional(z.record(z.string())),
});

const edrNetworkMempoolConfigSchema = z.object({
  order: unionType(
    [z.literal("fifo"), z.literal("priority")],
    "Expected 'fifo' or 'priority'",
  ),
});

const edrNetworkMiningConfigSchema = z.object({
  auto: z.boolean(),
  interval: unionType(
    [
      nonnegativeIntSchema,
      z.tuple([nonnegativeIntSchema, nonnegativeIntSchema]),
    ],
    "Expected a number or an array of numbers",
  ),
  mempool: z.optional(edrNetworkMempoolConfigSchema),
});

const edrNetworkConfigSchema = z.object({
  type: z.literal("edr"),
  accounts: edrNetworkAccountsConfigSchema,
  chainId: chainIdSchema,
  chainType: z.optional(chainTypeConfigSchema),
  from: z.optional(z.string()),
  gas: gasConfigSchema,
  gasMultiplier: nonnegativeNumberSchema,
  gasPrice: gasConfigSchema,

  // EDR network specific
  allowBlocksWithSameTimestamp: z.boolean(),
  allowUnlimitedContractSize: z.boolean(),
  blockGasLimit: gasUnitConfigSchema,
  chains: edrNetworkChainsConfigSchema,
  coinbase: z.instanceof(Uint8Array),
  enableRip7212: z.boolean(),
  enableTransientStorage: z.boolean(),
  forking: z.optional(edrNetworkForkingConfig),
  hardfork: z.nativeEnum(HardforkName),
  initialBaseFeePerGas: z.optional(gasUnitConfigSchema),
  initialDate: unionType(
    [z.string(), z.instanceof(Date)],
    "Expected a string or a Date",
  ),
  loggingEnabled: z.boolean(),
  minGasPrice: gasUnitConfigSchema,
  mining: edrNetworkMiningConfigSchema,
  networkId: chainIdSchema,
  throwOnCallFailures: z.boolean(),
  throwOnTransactionFailures: z.boolean(),
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
