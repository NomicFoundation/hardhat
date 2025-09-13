import type { HardhatUserConfig } from "../../../config.js";
import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  ResolvedConfigurationVariable,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";
import type {
  SolidityTestForkingConfig,
  SolidityTestUserConfig,
} from "../../../types/test.js";

import path from "node:path";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import {
  conditionalUnionType,
  sensitiveStringSchema,
  sensitiveUrlSchema,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const solidityTestUserConfigType = z.object({
  timeout: z.number().optional(),
  fsPermissions: z
    .object({
      readWriteFile: z.array(z.string()).optional(),
      readFile: z.array(z.string()).optional(),
      writeFile: z.array(z.string()).optional(),
      dangerouslyReadWriteDirectory: z.array(z.string()).optional(),
      readDirectory: z.array(z.string()).optional(),
      dangerouslyWriteDirectory: z.array(z.string()).optional(),
    })
    .optional(),
  isolate: z.boolean().optional(),
  ffi: z.boolean().optional(),
  allowInternalExpectRevert: z.boolean().optional(),
  from: z.string().startsWith("0x").optional(),
  txOrigin: z.string().startsWith("0x").optional(),
  initialBalance: z.bigint().optional(),
  blockBaseFeePerGas: z.bigint().optional(),
  coinbase: z.string().startsWith("0x").optional(),
  blockTimestamp: z.bigint().optional(),
  prevRandao: z.bigint().optional(),
  blockGasLimit: z.bigint().or(z.literal(false)).optional(),
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
  forking: z
    .object({
      url: z.optional(sensitiveUrlSchema),
      blockNumber: z.bigint().optional(),
      rpcEndpoints: z.record(sensitiveStringSchema).optional(),
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
  test: z
    .object({
      solidity: solidityTestUserConfigType.optional(),
    })
    .optional(),
});

export function resolveSolidityTestForkingConfig(
  forkingUserConfig: SolidityTestUserConfig["forking"],
  resolveConfigurationVariable: ConfigurationVariableResolver,
): SolidityTestForkingConfig | undefined {
  if (forkingUserConfig === undefined) {
    return undefined;
  }

  const resolvedRpcEndpoints: Record<string, ResolvedConfigurationVariable> =
    {};
  if (forkingUserConfig.rpcEndpoints !== undefined) {
    for (const [name, url] of Object.entries(forkingUserConfig.rpcEndpoints)) {
      resolvedRpcEndpoints[name] = resolveConfigurationVariable(url);
    }
  }

  return {
    ...forkingUserConfig,
    url:
      forkingUserConfig.url !== undefined
        ? resolveConfigurationVariable(forkingUserConfig.url)
        : undefined,
    rpcEndpoints: resolvedRpcEndpoints,
  };
}

export function validateSolidityTestUserConfig(
  userConfig: unknown,
): HardhatUserConfigValidationError[] {
  return validateUserConfigZodType(userConfig, userConfigType);
}

export async function resolveSolidityTestUserConfig(
  userConfig: HardhatUserConfig,
  resolvedConfig: HardhatConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): Promise<HardhatConfig> {
  let testsPath = userConfig.paths?.tests;

  // TODO: use isObject when the type narrowing issue is fixed
  testsPath = typeof testsPath === "object" ? testsPath.solidity : testsPath;
  testsPath ??= "test";

  const defaultRpcCachePath = path.join(resolvedConfig.paths.cache, "edr");

  const resolvedForking = resolveSolidityTestForkingConfig(
    userConfig.test?.solidity?.forking,
    resolveConfigurationVariable,
  );

  const solidityTest = {
    rpcCachePath: defaultRpcCachePath,
    ...userConfig.test?.solidity,
    forking: resolvedForking,
  };

  return {
    ...resolvedConfig,
    paths: {
      ...resolvedConfig.paths,
      tests: {
        ...resolvedConfig.paths.tests,
        solidity: resolveFromRoot(resolvedConfig.paths.root, testsPath),
      },
    },
    test: {
      ...resolvedConfig.test,
      solidity: solidityTest,
    },
  };
}
