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

const privateKeySchema = z
  .string({ message: "The private key should be a string" })
  .refine((val) => val.replace("0x", "").length === 64, {
    message: "The private key must be exactly 32 bytes long",
  })
  .refine((val) => /^[0-9a-fA-F]+$/.test(val.replace("0x", "")), {
    message: "The private key must contain only valid hexadecimal characters",
  });

const isValidPrivateKey = (val: string) => {
  if (typeof val !== "string") {
    // triggers the default error message of the validator invoking this function
    return false;
  }

  // if the key is not valid, it will trigger the key error message
  return privateKeySchema.safeParse(val);
};

const isValidHDAccountsUserConfig = (data: any) =>
  typeof data === "object" &&
  data !== null &&
  "mnemonic" in data &&
  typeof data.mnemonic === "string" &&
  (!("initialIndex" in data) || typeof data.initialIndex === "number") &&
  (!("count" in data) || (typeof data.count === "number" && data.count > 0)) &&
  (!("path" in data) || typeof data.path === "string") &&
  (!("passphrase" in data) || typeof data.passphrase === "string");

const httpNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) =>
        Array.isArray(data) && data.every((item) => isValidPrivateKey(item)),
      z.array(privateKeySchema),
    ],
    [
      isValidHDAccountsUserConfig,
      z.object({
        mnemonic: z.string(),
        initialIndex: z.optional(z.number().int()),
        count: z.optional(z.number().int().positive()),
        path: z.optional(z.string()),
        passphrase: z.optional(z.string()),
      }),
    ],
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

const isValidEdrKeyAndBalance = (data: any) =>
  Array.isArray(data) &&
  data.every((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("privateKey" in item) ||
      !("balance" in item) ||
      typeof item.balance !== "string"
    ) {
      // triggers the default error message of the validator invoking this function
      return false;
    }

    // if the key is not valid, it will trigger the key error message
    return isValidPrivateKey(item.privateKey);
  });

const isValidEdrNetworkHDAccountsUserConfig = (data: any) =>
  !Array.isArray(data) &&
  typeof data === "object" &&
  data !== null &&
  (!("mnemonic" in data) || typeof data.mnemonic === "string") &&
  (!("initialIndex" in data) || typeof data.initialIndex === "number") &&
  (!("count" in data) || (typeof data.count === "number" && data.count > 0)) &&
  (!("path" in data) || typeof data.path === "string") &&
  (!("accountsBalance" in data) || typeof data.accountsBalance === "string") &&
  (!("passphrase" in data) || typeof data.passphrase === "string");

const edrNetworkUserConfigAccountsSchema = conditionalUnionType(
  [
    [
      isValidEdrKeyAndBalance,
      z.array(
        z.object({
          privateKey: privateKeySchema,
          balance: z.string(),
        }),
      ),
    ],
    [
      isValidEdrNetworkHDAccountsUserConfig,
      z.object({
        mnemonic: z.optional(z.string()),
        initialIndex: z.optional(z.number().int()),
        count: z.optional(z.number().int().positive()),
        path: z.optional(z.string()),
        accountsBalance: z.optional(z.string()),
        passphrase: z.optional(z.string()),
      }),
    ],
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

const isValidHttpNetworkHDAccountsConfig = (data: any) =>
  typeof data === "object" &&
  data !== null &&
  "mnemonic" in data &&
  typeof data.mnemonic === "string" &&
  "initialIndex" in data &&
  typeof data.initialIndex === "number" &&
  "count" in data &&
  typeof data.count === "number" &&
  data.count > 0 &&
  "path" in data &&
  typeof data.path === "string" &&
  "passphrase" in data &&
  typeof data.passphrase === "string";

const httpNetworkAccountsSchema = conditionalUnionType(
  [
    [(data) => data === "remote", z.literal("remote")],
    [
      (data) =>
        Array.isArray(data) &&
        data.every((item) => {
          if (typeof item !== "string") {
            return false;
          }
          return privateKeySchema.safeParse(item);
        }),
      z.array(privateKeySchema),
    ],
    [
      isValidHttpNetworkHDAccountsConfig,
      z.object({
        mnemonic: z.string(),
        initialIndex: z.number().int(),
        count: z.number().int().positive(),
        path: z.string(),
        passphrase: z.string(),
      }),
    ],
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

const isValidEdrNetworkHDAccountsConfig = (data: any) =>
  !Array.isArray(data) &&
  typeof data === "object" &&
  data !== null &&
  "mnemonic" in data &&
  typeof data.mnemonic === "string" &&
  "initialIndex" in data &&
  typeof data.initialIndex === "number" &&
  "count" in data &&
  typeof data.count === "number" &&
  data.count > 0 &&
  "path" in data &&
  typeof data.path === "string" &&
  "accountsBalance" in data &&
  typeof data.accountsBalance === "string" &&
  "passphrase" in data &&
  typeof data.passphrase === "string";

const edrNetworkAccountsSchema = conditionalUnionType(
  [
    [
      isValidEdrKeyAndBalance,
      z.array(
        z.object({
          privateKey: privateKeySchema,
          balance: z.string(),
        }),
      ),
    ],
    [
      isValidEdrNetworkHDAccountsConfig,
      z.object({
        mnemonic: z.string(),
        initialIndex: z.number().int(),
        count: z.number().int().positive(),
        path: z.string(),
        accountsBalance: z.string(),
        passphrase: z.string(),
      }),
    ],
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
