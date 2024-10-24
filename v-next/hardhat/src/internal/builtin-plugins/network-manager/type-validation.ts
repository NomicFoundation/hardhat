import type {
  HardhatUserConfig,
  NetworkConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import {
  conditionalUnionType,
  sensitiveUrlSchema,
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const ACCOUNTS_ERROR = `Error in the "accounts" property in configuration:`;

const HD_ACCOUNT_MNEMONIC_MSG = `${ACCOUNTS_ERROR} the "mnemonic" property of the HD account must be a string`;
const HD_ACCOUNT_INITIAL_INDEX_MSG = `${ACCOUNTS_ERROR} the "initialIndex" property of the HD account must be an integer number`;
const HD_ACCOUNT_COUNT_MSG = `${ACCOUNTS_ERROR} the "count" property of the HD account must be a positive integer number`;
const HD_ACCOUNT_PATH_MSG = `${ACCOUNTS_ERROR} the "path" property of the HD account must be a string`;
const HD_ACCOUNT_PASSPHRASE_MSG = `${ACCOUNTS_ERROR} the "passphrase" property of the HD account must be a string`;
const HD_ACCOUNT_BALANCE_MSG = `${ACCOUNTS_ERROR} the "balance" property of the HD account must be a string`;

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

const accountsPrivateKeySchema = z
  .string({
    message: `${ACCOUNTS_ERROR} the private key must be a string`,
  })
  .refine((val) => val.replace("0x", "").length === 64, {
    message: `${ACCOUNTS_ERROR} the private key must be exactly 32 bytes long`,
  })
  .refine((val) => /^[0-9a-fA-F]+$/.test(val.replace("0x", "")), {
    message: `${ACCOUNTS_ERROR} the private key must contain only valid hexadecimal characters`,
  });

const canBeValidatedAsPrivateKey = (val: any) => {
  // Allow numbers (hex literals) even if unsupported, to provide a more detailed error message about the private key
  return typeof val === "string" || typeof val === "number";
};

const canBeValidatedAsHdAccount = (val: any) => {
  const allowedProperties = [
    "mnemonic",
    "initialIndex",
    "count",
    "path",
    "passphrase",
    "accountsBalance",
  ];

  return (
    typeof val === "object" &&
    val !== null &&
    Object.keys(val).every((key) => allowedProperties.includes(key))
  );
};

const httpNetworkHDAccountsUserConfig = z.object({
  mnemonic: z.string({
    message: HD_ACCOUNT_MNEMONIC_MSG,
  }),
  initialIndex: z.optional(
    z
      .number({
        message: HD_ACCOUNT_INITIAL_INDEX_MSG,
      })
      .int(),
  ),
  count: z.optional(
    z
      .number({
        message: HD_ACCOUNT_COUNT_MSG,
      })
      .int({ message: HD_ACCOUNT_COUNT_MSG })
      .positive({ message: HD_ACCOUNT_COUNT_MSG }),
  ),
  path: z.optional(
    z.string({
      message: HD_ACCOUNT_PATH_MSG,
    }),
  ),
  passphrase: z.optional(
    z.string({
      message: HD_ACCOUNT_PASSPHRASE_MSG,
    }),
  ),
});

const httpNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) => Array.isArray(data) && data.every(canBeValidatedAsPrivateKey),
      z.array(accountsPrivateKeySchema),
    ],
    [canBeValidatedAsHdAccount, httpNetworkHDAccountsUserConfig],
  ],
  `The "accounts" property in the configuration should be set to one of the following values: "remote", an array of private keys, or an object containing a mnemonic value and optional account details such as initialIndex, count, path, and passphrase`,
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

const keyBalanceObject = z.object({
  privateKey: accountsPrivateKeySchema,
  balance: z.string({ message: `${ACCOUNTS_ERROR} balance must be a string` }),
});

const canBeValidatedAsEdrKeyAndBalance = (item: any) => {
  return (
    typeof item === "object" &&
    item !== null &&
    "privateKey" in item &&
    "balance" in item
  );
};

const edrNetworkHDAccountsUserConfig = z.object({
  mnemonic: z.optional(
    z.string({
      message: HD_ACCOUNT_MNEMONIC_MSG,
    }),
  ),
  initialIndex: z.optional(
    z
      .number({
        message: HD_ACCOUNT_INITIAL_INDEX_MSG,
      })
      .int({ message: HD_ACCOUNT_INITIAL_INDEX_MSG }),
  ),
  count: z.optional(
    z
      .number({
        message: HD_ACCOUNT_COUNT_MSG,
      })
      .int({
        message: HD_ACCOUNT_COUNT_MSG,
      })
      .positive({
        message: HD_ACCOUNT_COUNT_MSG,
      }),
  ),
  path: z.optional(
    z.string({
      message: HD_ACCOUNT_PATH_MSG,
    }),
  ),
  accountsBalance: z.optional(
    z.string({
      message: HD_ACCOUNT_BALANCE_MSG,
    }),
  ),
  passphrase: z.optional(
    z.string({
      message: HD_ACCOUNT_PASSPHRASE_MSG,
    }),
  ),
});

const edrNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [
      (data) =>
        Array.isArray(data) && data.every(canBeValidatedAsEdrKeyAndBalance),
      z.array(keyBalanceObject),
    ],
    [canBeValidatedAsHdAccount, edrNetworkHDAccountsUserConfig],
  ],
  `The "accounts" property in the configuration should be set to one of the following values: an array of objects with 'privateKey' and 'balance', or an object containing optional account details such as mnemonic, initialIndex, count, path, accountsBalance, and passphrase`,
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

const httpNetworkHDAccountsConfig = z.object({
  mnemonic: z.string({ message: HD_ACCOUNT_MNEMONIC_MSG }),
  initialIndex: z
    .number({ message: HD_ACCOUNT_INITIAL_INDEX_MSG })
    .int({ message: HD_ACCOUNT_INITIAL_INDEX_MSG }),
  count: z
    .number({ message: HD_ACCOUNT_COUNT_MSG })
    .int({ message: HD_ACCOUNT_COUNT_MSG })
    .positive({ message: HD_ACCOUNT_COUNT_MSG }),
  path: z.string({ message: HD_ACCOUNT_PATH_MSG }),
  passphrase: z.string({ message: HD_ACCOUNT_PASSPHRASE_MSG }),
});

const httpNetworkAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) => Array.isArray(data) && data.every(canBeValidatedAsPrivateKey),
      z.array(accountsPrivateKeySchema),
    ],
    [canBeValidatedAsHdAccount, httpNetworkHDAccountsConfig],
  ],
  `The "accounts" property in the configuration should be set to one of the following values: "remote", an array of private keys, or an object containing account details such as mnemonic, initialIndex, count, path, and passphrase`,
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

const edrNetworkHDAccountsConfig = z.object({
  mnemonic: z.string({ message: HD_ACCOUNT_MNEMONIC_MSG }),
  initialIndex: z
    .number({ message: HD_ACCOUNT_INITIAL_INDEX_MSG })
    .int({ message: HD_ACCOUNT_INITIAL_INDEX_MSG }),
  count: z
    .number({ message: HD_ACCOUNT_COUNT_MSG })
    .int({ message: HD_ACCOUNT_COUNT_MSG })
    .positive({ message: HD_ACCOUNT_COUNT_MSG }),
  path: z.string({ message: HD_ACCOUNT_PATH_MSG }),
  accountsBalance: z.string({ message: HD_ACCOUNT_BALANCE_MSG }),
  passphrase: z.string({ message: HD_ACCOUNT_PASSPHRASE_MSG }),
});

const edrNetworkAccountsSchema = conditionalUnionType(
  [
    [
      (data) =>
        Array.isArray(data) && data.every(canBeValidatedAsEdrKeyAndBalance),
      z.array(keyBalanceObject),
    ],
    [canBeValidatedAsHdAccount, edrNetworkHDAccountsConfig],
  ],
  `The "accounts" property in the configuration should be set to one of the following values: an array of objects with 'privateKey' and 'balance', or an object containing account details such as mnemonic, initialIndex, count, path, accountsBalance, and passphrase`,
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
