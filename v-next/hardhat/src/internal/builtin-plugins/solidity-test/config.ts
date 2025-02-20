import type { HardhatUserConfig } from "../../../config.js";
import type { HardhatConfig } from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import {
  conditionalUnionType,
  unionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const solidityTestUserConfigType = z.object({
  timeout: z.number().optional(),
  fsPermissions: z
    .object({
      readWrite: z.array(z.string()).optional(),
      read: z.array(z.string()).optional(),
      write: z.array(z.string()).optional(),
    })
    .optional(),
  testFail: z.boolean().optional(),
  labels: z
    .array(
      z.object({
        address: z.string().startsWith("0x"),
        label: z.string(),
      }),
    )
    .optional(),
  isolate: z.boolean().optional(),
  ffi: z.boolean().optional(),
  sender: z.string().startsWith("0x").optional(),
  txOrigin: z.string().startsWith("0x").optional(),
  initialBalance: z.bigint().optional(),
  blockBaseFeePerGas: z.bigint().optional(),
  blockCoinbase: z.string().startsWith("0x").optional(),
  blockTimestamp: z.bigint().optional(),
  blockDifficulty: z.bigint().optional(),
  blockGasLimit: z.bigint().optional(),
  disableBlockGasLimit: z.boolean().optional(),
  memoryLimit: z.bigint().optional(),
  ethRpcUrl: z.string().optional(),
  forkBlockNumber: z.bigint().optional(),
  rpcEndpoints: z.record(z.string()).optional(),
  rpcCachePath: z.string().optional(),
  rpcStorageCaching: z
    .object({
      chains: unionType(
        [z.enum(["All", "None"]), z.array(z.string())],
        "Expected `All`, `None` or a list of chain names to cache",
      ),
      endpoints: unionType(
        [
          z.enum(["All", "Remote"]),
          z.object({
            source: z.string(),
          }),
        ],
        "Expected `All`, `Remote` or a RegExp object matching endpoints to cacche",
      ),
    })
    .optional(),
  promptTimeout: z.number().optional(),
  fuzz: z
    .object({
      failurePersistDir: z.string().optional(),
      failurePersistFile: z.string().optional(),
      runs: z.number().optional(),
      maxTestRejects: z.number().optional(),
      seed: z.string().optional(),
      dictionaryWeight: z.number().optional(),
      includeStorage: z.boolean().optional(),
      includePushBytes: z.boolean().optional(),
    })
    .optional(),
  invariant: z
    .object({
      failurePersistDir: z.string().optional(),
      runs: z.number().optional(),
      depth: z.number().optional(),
      failOnRevert: z.boolean().optional(),
      callOverride: z.boolean().optional(),
      dictionaryWeight: z.number().optional(),
      includeStorage: z.boolean().optional(),
      includePushBytes: z.boolean().optional(),
      shrinkRunLimit: z.number().optional(),
    })
    .optional(),
});

const userConfigType = z.object({
  paths: z
    .object({
      test: conditionalUnionType(
        [
          [isObject, z.object({ solidity: z.string().optional() })],
          [(data) => typeof data === "string", z.string()],
        ],
        "Expected a string or an object with an optional 'solidity' property",
      ).optional(),
    })
    .optional(),
  solidityTest: solidityTestUserConfigType.optional(),
});

export function validateSolidityTestUserConfig(
  userConfig: unknown,
): HardhatUserConfigValidationError[] {
  return validateUserConfigZodType(userConfig, userConfigType);
}

export async function resolveSolidityTestUserConfig(
  userConfig: HardhatUserConfig,
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfig> {
  let testsPath = userConfig.paths?.tests;

  // TODO: use isObject when the type narrowing issue is fixed
  testsPath = typeof testsPath === "object" ? testsPath.solidity : testsPath;
  testsPath ??= "test";

  return {
    ...resolvedConfig,
    paths: {
      ...resolvedConfig.paths,
      tests: {
        ...resolvedConfig.paths.tests,
        solidity: resolveFromRoot(resolvedConfig.paths.root, testsPath),
      },
    },
    solidityTest: userConfig.solidityTest ?? {},
  };
}
