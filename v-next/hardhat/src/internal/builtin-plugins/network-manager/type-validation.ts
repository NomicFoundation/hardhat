import type {
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
} from "@ignored/hardhat-vnext-utils/hex";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";
import {
  conditionalUnionType,
  configurationVariableSchema,
  sensitiveStringSchema,
  sensitiveUrlSchema,
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../constants.js";

import {
  hardforkGte,
  HardforkName,
  LATEST_HARDFORK,
} from "./edr/types/hardfork.js";

const nonnegativeNumberSchema = z.number().nonnegative();
const nonnegativeIntSchema = z.number().int().nonnegative();
const nonnegativeBigIntSchema = z.bigint().nonnegative();

const blockNumberSchema = nonnegativeIntSchema;
const chainIdSchema = nonnegativeIntSchema;
const hardforkNameSchema = z.nativeEnum(HardforkName);

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

const chainTypeUserConfigSchema = unionType(
  [
    z.literal(L1_CHAIN_TYPE),
    z.literal(OPTIMISM_CHAIN_TYPE),
    z.literal(GENERIC_CHAIN_TYPE),
  ],
  `Expected '${L1_CHAIN_TYPE}', '${OPTIMISM_CHAIN_TYPE}', or '${GENERIC_CHAIN_TYPE}'`,
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
  `Expected an array with with objects with private key and balance or Configuration Variables, or an object with HD account details`,
);

const hardforkHistoryUserConfigSchema = z.map(
  hardforkNameSchema,
  blockNumberSchema,
);

const edrNetworkChainUserConfigSchema = z.object({
  hardforkHistory: z.optional(hardforkHistoryUserConfigSchema),
});

const edrNetworkChainsUserConfigSchema = z.map(
  chainIdSchema,
  edrNetworkChainUserConfigSchema,
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
  chains: z.optional(edrNetworkChainsUserConfigSchema),
  coinbase: z.optional(z.string()),
  enableRip7212: z.optional(z.boolean()),
  enableTransientStorage: z.optional(z.boolean()),
  forking: z.optional(edrNetworkForkingUserConfigSchema),
  hardfork: z.optional(hardforkNameSchema),
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
  networkConfig: z.infer<typeof baseNetworkUserConfigSchema>,
  ctx: RefinementCtx,
): void {
  if (networkConfig.type === "edr") {
    const {
      hardfork = LATEST_HARDFORK,
      minGasPrice,
      initialBaseFeePerGas,
      enableTransientStorage,
    } = networkConfig;

    if (hardforkGte(hardfork, HardforkName.LONDON)) {
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
      !hardforkGte(hardfork, HardforkName.CANCUN) &&
      enableTransientStorage === true
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'enableTransientStorage' is not supported for hardforks before 'cancun'. Please use a hardfork from 'cancun' onwards to enable this feature.`,
      });
    }
    if (
      hardforkGte(hardfork, HardforkName.CANCUN) &&
      enableTransientStorage === false
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'enableTransientStorage' must be enabled for hardforks 'cancun' or later. To disable this feature, use a hardfork before 'cancun'.`,
      });
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
  defaultChainType: z.optional(chainTypeUserConfigSchema),
  defaultNetwork: z.optional(z.string()),
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
