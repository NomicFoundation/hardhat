import type {
  ActivationBlockNumberUserConfig,
  ActivationTimestampUserConfig,
  EdrNetworkForkingConfig,
  EdrNetworkHDAccountsConfig,
  EdrNetworkMiningConfig,
  HardhatUserConfig,
  HttpNetworkHDAccountsConfig,
  HttpNetworkHDAccountsUserConfig,
  NetworkUserConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";
import type { RefinementCtx } from "zod";

import {
  getUnprefixedHexString,
  isHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  conditionalUnionType,
  configurationVariableSchema,
  sensitiveStringSchema,
  sensitiveUrlSchema,
  unionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../constants.js";

import {
  hardforkGte,
  L1HardforkName,
  isValidHardforkName,
  getHardforks,
  getCurrentHardfork,
} from "./edr/types/hardfork.js";

const nonnegativeNumberSchema = z.number().nonnegative();
const nonnegativeIntSchema = z.number().int().nonnegative();
const nonnegativeBigIntSchema = z.bigint().nonnegative();

const blockNumberSchema = nonnegativeIntSchema;
const chainIdSchema = nonnegativeIntSchema;

const chainTypeUserConfigSchema = unionType(
  [
    z.literal(L1_CHAIN_TYPE),
    z.literal(OPTIMISM_CHAIN_TYPE),
    z.literal(GENERIC_CHAIN_TYPE),
  ],
  `Expected '${L1_CHAIN_TYPE}', '${OPTIMISM_CHAIN_TYPE}', or '${GENERIC_CHAIN_TYPE}'`,
);

const hardforkHistoryUserConfigSchema: z.ZodRecord<
  z.ZodString,
  | z.ZodType<ActivationBlockNumberUserConfig>
  | z.ZodType<ActivationTimestampUserConfig>
> = z.record(
  conditionalUnionType(
    [
      [
        (data) => isObject(data) && typeof data.blockNumber === "number",
        z.strictObject({
          blockNumber: blockNumberSchema,
        }),
      ],
      [
        (data) => isObject(data) && typeof data.timestamp === "number",
        z.strictObject({
          timestamp: nonnegativeIntSchema,
        }),
      ],
    ],
    "Expected an object with either a blockNumber or a timestamp",
  ),
);

const blockExplorerUserConfigSchema = z.object({
  name: z.optional(z.string()),
  url: z.string(),
  apiUrl: z.string(),
});

const blockExplorersUserConfigSchema = z.object({
  etherscan: z.optional(blockExplorerUserConfigSchema),
  blockscout: z.optional(blockExplorerUserConfigSchema),
});

const chainDescriptorUserConfigSchema = z.object({
  name: z.string(),
  chainType: z.optional(chainTypeUserConfigSchema),
  hardforkHistory: z.optional(hardforkHistoryUserConfigSchema),
  blockExplorers: z.optional(blockExplorersUserConfigSchema),
});

const chainDescriptorsUserConfigSchema = z
  .record(
    // Allow both numbers and strings for chainId to support larger chainIds
    unionType([chainIdSchema, z.string()], "Expected a number or a string"),
    chainDescriptorUserConfigSchema,
  )
  .superRefine((chainDescriptors, ctx) => {
    if (chainDescriptors !== undefined) {
      Object.entries(chainDescriptors).forEach(([chainId, chainDescriptor]) => {
        if (chainDescriptor.hardforkHistory === undefined) {
          return;
        }

        const type = chainDescriptor.chainType ?? GENERIC_CHAIN_TYPE;
        let previousKind: "block" | "timestamp" = "block";
        let previousValue = 0;
        Object.entries(chainDescriptor.hardforkHistory).forEach(
          ([name, activation]) => {
            const errorPath = [chainId, "hardforkHistory", name];

            if (!isValidHardforkName(name, type)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: errorPath,
                message: `Invalid hardfork name ${name} found in chain descriptor for chain ${chainId}. Expected ${getHardforks(type).join(" | ")}.`,
              });
            }

            if (activation.blockNumber !== undefined) {
              // Block numbers must be in ascending order
              if (
                previousKind === "block" &&
                activation.blockNumber < previousValue
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: errorPath,
                  message: `Invalid block number ${activation.blockNumber} found in chain descriptor for chain ${chainId}. Block numbers must be in ascending order.`,
                });
              }

              // Block numbers must be defined before timestamps
              if (previousKind === "timestamp") {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: errorPath,
                  message: `Invalid block number ${activation.blockNumber} found in chain descriptor for chain ${chainId}. Block number cannot be defined after a timestamp.`,
                });
              }

              previousKind = "block";
              previousValue = activation.blockNumber;
            }
            // Timestamps must be in ascending order
            else if (activation.timestamp !== undefined) {
              if (
                previousKind === "timestamp" &&
                activation.timestamp < previousValue
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: errorPath,
                  message: `Invalid timestamp ${activation.timestamp} found in chain descriptor for chain ${chainId}. Timestamps must be in ascending order.`,
                });
              }

              previousKind = "timestamp";
              previousValue = activation.timestamp;
            }
          },
        );
      });
    }
  });

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
  mnemonic: sensitiveStringSchema,
  count: z.optional(nonnegativeIntSchema),
  initialIndex: z.optional(nonnegativeIntSchema),
  passphrase: z.optional(sensitiveStringSchema),
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
  mnemonic: z.optional(sensitiveStringSchema),
  accountsBalance: z.optional(accountBalanceUserConfigSchema),
  count: z.optional(nonnegativeIntSchema),
  initialIndex: z.optional(nonnegativeIntSchema),
  passphrase: z.optional(sensitiveStringSchema),
  path: z.optional(z.string()),
});

const edrNetworkAccountsUserConfigSchema = conditionalUnionType(
  [
    [(data) => Array.isArray(data), z.array(edrNetworkAccountUserConfigSchema)],
    [isObject, edrNetworkHDAccountsUserConfigSchema],
  ],
  `Expected an array with objects with private key and balance or Configuration Variables, or an object with HD account details`,
);

const edrNetworkForkingUserConfigSchema = z.object({
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
  coinbase: z.optional(z.string()),
  enableRip7212: z.optional(z.boolean()),
  enableTransientStorage: z.optional(z.boolean()),
  forking: z.optional(edrNetworkForkingUserConfigSchema),
  hardfork: z.optional(z.string()),
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

const baseNetworkUserConfigSchema = z.discriminatedUnion("type", [
  httpNetworkUserConfigSchema,
  edrNetworkUserConfigSchema,
]);

function refineEdrNetworkUserConfig(
  networkConfig: NetworkUserConfig,
  ctx: RefinementCtx,
): void {
  if (networkConfig.type === "edr") {
    const {
      chainType = GENERIC_CHAIN_TYPE,
      hardfork,
      minGasPrice,
      initialBaseFeePerGas,
      enableTransientStorage,
    } = networkConfig;

    if (hardfork !== undefined && !isValidHardforkName(hardfork, chainType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hardfork"],
        message: `Invalid hardfork name ${hardfork} for chainType ${chainType}. Expected ${getHardforks(
          chainType,
        ).join(" | ")}.`,
      });
    }

    const resolvedHardfork = hardfork ?? getCurrentHardfork(chainType);
    if (chainType === L1_CHAIN_TYPE || chainType === GENERIC_CHAIN_TYPE) {
      if (hardforkGte(resolvedHardfork, L1HardforkName.LONDON, chainType)) {
        if (minGasPrice !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "minGasPrice is not valid for networks with EIP-1559. Try an older hardfork or remove it.",
          });
        }
      } else {
        if (initialBaseFeePerGas !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "initialBaseFeePerGas is only valid for networks with EIP-1559. Try a newer hardfork or remove it.",
          });
        }
      }

      if (
        !hardforkGte(resolvedHardfork, L1HardforkName.CANCUN, chainType) &&
        enableTransientStorage === true
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'enableTransientStorage' is not supported for hardforks before 'cancun'. Please use a hardfork from 'cancun' onwards to enable this feature.`,
        });
      }
      if (
        hardforkGte(resolvedHardfork, L1HardforkName.CANCUN, chainType) &&
        enableTransientStorage === false
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'enableTransientStorage' must be enabled for hardforks 'cancun' or later. To disable this feature, use a hardfork before 'cancun'.`,
        });
      }
    }

    if (
      typeof networkConfig.mining?.interval === "number" ||
      Array.isArray(networkConfig.mining?.interval)
    ) {
      const interval = networkConfig.mining.interval;
      const minInterval =
        typeof interval === "number" ? interval : Math.min(...interval);
      if (
        minInterval < 1000 &&
        networkConfig.allowBlocksWithSameTimestamp !== true
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `mining.interval is set to less than 1000 ms. To avoid the block timestamp diverging from clock time, please set allowBlocksWithSameTimestamp: true on the network config`,
        });
      }
    }
  }
}

// The superRefine is used to perform additional validation of correlated
// fields of the edr network that are not possible to express with Zod's
// built-in validation methods.
// Ideally, it should be applied to the edrNetworkUserConfigSchema, but it
// returns a ZodEffects, which is not compatible with the discriminatedUnion
// method, so it is applied to the networkUserConfigSchema instead.
const networkUserConfigSchema = baseNetworkUserConfigSchema.superRefine(
  refineEdrNetworkUserConfig,
);

const userConfigSchema = z.object({
  chainDescriptors: z.optional(chainDescriptorsUserConfigSchema),
  defaultChainType: z.optional(chainTypeUserConfigSchema),
  networks: z.optional(z.record(networkUserConfigSchema)),
});

const networkConfigOverrideSchema = z
  .discriminatedUnion("type", [
    httpNetworkUserConfigSchema.strict(),
    edrNetworkUserConfigSchema.strict(),
  ])
  .superRefine(refineEdrNetworkUserConfig);

export async function validateNetworkUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigSchema);
}

export async function validateNetworkConfigOverride(
  networkConfigOverride: NetworkUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(
    networkConfigOverride,
    networkConfigOverrideSchema,
  );
}

// This type guard does not check beyond accounts being an object
// because the actual structure of the object is validated by Zod.
export function isHttpNetworkHdAccountsUserConfig(
  accounts: unknown,
): accounts is HttpNetworkHDAccountsUserConfig {
  return isObject(accounts);
}

export function isHttpNetworkHdAccountsConfig(
  accounts: unknown,
): accounts is HttpNetworkHDAccountsConfig {
  return (
    isObject(accounts) &&
    "mnemonic" in accounts &&
    "count" in accounts &&
    "initialIndex" in accounts &&
    "passphrase" in accounts &&
    "path" in accounts
  );
}

export function isEdrNetworkHdAccountsConfig(
  accounts: unknown,
): accounts is EdrNetworkHDAccountsConfig {
  return (
    isObject(accounts) &&
    "mnemonic" in accounts &&
    "accountsBalance" in accounts &&
    "count" in accounts &&
    "initialIndex" in accounts &&
    "passphrase" in accounts &&
    "path" in accounts
  );
}

export function isEdrNetworkForkingConfig(
  forking: unknown,
): forking is EdrNetworkForkingConfig {
  return (
    isObject(forking) &&
    "enabled" in forking &&
    "url" in forking &&
    "cacheDir" in forking
  );
}

export function isEdrNetworkMiningConfig(
  mining: unknown,
): mining is EdrNetworkMiningConfig {
  return (
    isObject(mining) &&
    "auto" in mining &&
    "interval" in mining &&
    "mempool" in mining
  );
}
