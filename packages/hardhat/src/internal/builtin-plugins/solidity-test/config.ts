import type { HardhatUserConfig } from "../../../config.js";
import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  ResolvedConfigurationVariable,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";
import type {
  SolidityTestForkingConfig,
  SolidityTestProfileConfig,
  SolidityTestProfileUserConfig,
} from "../../../types/test.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import {
  conditionalUnionType,
  incompatibleFieldType,
  sensitiveStringSchema,
  sensitiveUrlSchema,
  unionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import { DEFAULT_TEST_PROFILE } from "./test-profiles.js";

// the keccak256 of "built for ethereum"
export const DEFAULT_FUZZ_SEED =
  "0x7727ea51af0441c20da14dcd68a15dac8c9ebd589c5be8fa8c87c1d3720450bc";

const solidityTestProfileUserConfigType = z.object({
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
  gasLimit: z.bigint().optional(),
  blockGasLimit: z.number().or(z.bigint()).or(z.literal(false)).optional(),
  transactionGasCap: z.number().or(z.bigint()).or(z.literal(false)).optional(),
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
      showLogs: z.boolean().optional(),
    })
    .optional(),
  forking: z
    .object({
      url: z.optional(sensitiveUrlSchema),
      blockNumber: z.optional(
        unionType(
          [z.number().int().nonnegative().safe(), z.bigint().nonnegative()],
          "Expected a nonnegative safe int or a nonnegative bigint",
        ),
      ),
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
  eip712Types: z
    .object({
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
});

const solidityTestFlatUserConfigType = solidityTestProfileUserConfigType.extend(
  {
    profiles: incompatibleFieldType(
      "This field is incompatible with the flat solidity test config",
    ),
  },
);

const solidityTestProfilesUserConfigType = z.object({
  profiles: z
    .record(z.string(), solidityTestProfileUserConfigType)
    .refine(
      (profiles) => DEFAULT_TEST_PROFILE in profiles,
      "A `default` profile is required when using `profiles`",
    )
    .refine(
      (profiles) =>
        !(DEFAULT_TEST_PROFILE in profiles) ||
        Object.keys(profiles).every((name) => name === DEFAULT_TEST_PROFILE),
      "Only the `default` profile is supported. Other profile names will be supported in a future release.",
    ),
});

const solidityTestUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) && "profiles" in data && Object.keys(data).length === 1,
      solidityTestProfilesUserConfigType,
    ],
    [isObject, solidityTestFlatUserConfigType],
  ],
  "Expected a Solidity test config or a `{ profiles: { ... } }` wrapper",
);

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
  forkingUserConfig: SolidityTestProfileUserConfig["forking"],
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
    blockNumber:
      forkingUserConfig.blockNumber !== undefined
        ? BigInt(forkingUserConfig.blockNumber)
        : undefined,
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

  const solidityUserConfig = userConfig.test?.solidity;
  let profileUserConfig: SolidityTestProfileUserConfig | undefined;
  if (solidityUserConfig !== undefined && "profiles" in solidityUserConfig) {
    profileUserConfig = solidityUserConfig.profiles[DEFAULT_TEST_PROFILE];
    assertHardhatInvariant(
      profileUserConfig !== undefined,
      "default profile must be present when the profiles wrapper user config is supplied",
    );
  } else {
    profileUserConfig = solidityUserConfig;
  }

  const resolvedForking = resolveSolidityTestForkingConfig(
    profileUserConfig?.forking,
    resolveConfigurationVariable,
  );

  const resolvedDefaultProfile = {
    rpcCachePath: defaultRpcCachePath,
    ...profileUserConfig,
    fuzz: resolveFuzzConfig(profileUserConfig?.fuzz),
    forking: resolvedForking,
    eip712Types: resolveEip712TypesConfig(profileUserConfig?.eip712Types),
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
      solidity: {
        profiles: { [DEFAULT_TEST_PROFILE]: resolvedDefaultProfile },
      },
    },
  };
}

export function resolveFuzzConfig(
  fuzzUserConfig: SolidityTestProfileUserConfig["fuzz"] = {},
): SolidityTestProfileConfig["fuzz"] {
  return {
    ...fuzzUserConfig,
    seed: fuzzUserConfig.seed ?? DEFAULT_FUZZ_SEED,
  };
}

export function resolveEip712TypesConfig(
  eip712TypesUserConfig: SolidityTestProfileUserConfig["eip712Types"] = {},
): SolidityTestProfileConfig["eip712Types"] {
  return {
    include: eip712TypesUserConfig.include ?? [],
    exclude: eip712TypesUserConfig.exclude ?? [],
  };
}
