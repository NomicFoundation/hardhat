import type { HardhatUserConfig } from "../../../config.js";
import type {
  HardhatConfig,
  SolidityBuildProfileConfig,
  SolidityConfig,
  SolidityUserConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { isObject } from "@ignored/hardhat-vnext-utils/lang";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import {
  conditionalUnionType,
  incompatibleFieldType,
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

import { DEFAULT_BUILD_PROFILES } from "./build-profiles.js";

const sourcePathsType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string()],
    [(data) => Array.isArray(data), z.array(z.string()).nonempty()],
  ],
  "Expected a string or an array of strings",
);

const solcUserConfigType = z.object({
  version: z.string(),
  settings: z.any().optional(),
  compilers: incompatibleFieldType("This field is incompatible with `version`"),
  overrides: incompatibleFieldType("This field is incompatible with `version`"),
  profiles: incompatibleFieldType("This field is incompatible with `version`"),
});

const solidityTestUserConfigType = z.object({
  timeout: z.number().optional(),
  fsPermissions: z
    .object({
      readWrite: z.array(z.string()).optional(),
      read: z.array(z.string()).optional(),
      write: z.array(z.string()).optional(),
    })
    .optional(),
  trace: z.boolean().optional(),
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

const singleVersionSolcUserConfigType = solcUserConfigType;

const multiVersionSolcUserConfigType = z.object({
  compilers: z.array(solcUserConfigType).nonempty(),
  overrides: z.record(z.string(), solcUserConfigType).optional(),
  version: incompatibleFieldType("This field is incompatible with `compilers`"),
  settings: incompatibleFieldType(
    "This field is incompatible with `compilers`",
  ),
});

const commonSolidityUserConfigType = z.object({
  dependenciesToCompile: z.array(z.string()).optional(),
  remappings: z.array(z.string()).optional(),
  test: solidityTestUserConfigType.optional(),
});

const singleVersionSolidityUserConfigType = singleVersionSolcUserConfigType
  .merge(commonSolidityUserConfigType)
  .extend({
    compilers: incompatibleFieldType(
      "This field is incompatible with `version`",
    ),
    overrides: incompatibleFieldType(
      "This field is incompatible with `version`",
    ),
    profiles: incompatibleFieldType(
      "This field is incompatible with `version`",
    ),
  });

const multiVersionSolidityUserConfigType = multiVersionSolcUserConfigType
  .merge(commonSolidityUserConfigType)
  .extend({
    version: incompatibleFieldType(
      "This field is incompatible with `compilers`",
    ),
    profiles: incompatibleFieldType(
      "This field is incompatible with `compilers`",
    ),
  });

const buildProfilesSolidityUserConfigType = commonSolidityUserConfigType.extend(
  {
    profiles: z.record(
      z.string(),
      conditionalUnionType(
        [
          [
            (data) => isObject(data) && "version" in data,
            singleVersionSolcUserConfigType,
          ],
          [
            (data) => isObject(data) && "compilers" in data,
            multiVersionSolcUserConfigType,
          ],
        ],
        "Expected an object configuring one or more versions of Solidity",
      ),
    ),
    version: incompatibleFieldType(
      "This field is incompatible with `profiles`",
    ),
    compilers: incompatibleFieldType(
      "This field is incompatible with `profiles`",
    ),
    overrides: incompatibleFieldType(
      "This field is incompatible with `profiles`",
    ),
  },
);

const soldityUserConfigType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string()],
    [(data) => Array.isArray(data), z.array(z.string()).nonempty()],
    [
      (data) => isObject(data) && "version" in data,
      singleVersionSolidityUserConfigType,
    ],
    [
      (data) => isObject(data) && "compilers" in data,
      multiVersionSolidityUserConfigType,
    ],
    [
      (data) => isObject(data) && "profiles" in data,
      buildProfilesSolidityUserConfigType,
    ],
  ],
  "Expected a version string, an array of version strings, or an object cofiguring one or more versions of Solidity or multiple build profiles",
);

const userConfigType = z.object({
  paths: z
    .object({
      sources: conditionalUnionType(
        [
          [isObject, z.object({ solidity: sourcePathsType.optional() })],
          [
            (data) => typeof data === "string" || Array.isArray(data),
            sourcePathsType,
          ],
        ],
        "Expected a string, an array of strings, or an object with an optional 'solidity' property",
      ).optional(),
    })
    .optional(),
  solidity: soldityUserConfigType.optional(),
});

export function validateSolidityUserConfig(
  userConfig: unknown,
): HardhatUserConfigValidationError[] {
  const result = validateUserConfigZodType(userConfig, userConfigType);

  if (
    isObject(userConfig) &&
    isObject(userConfig.solidity) &&
    isObject(userConfig.solidity.profiles) &&
    !("default" in userConfig.solidity.profiles)
  ) {
    result.push({
      message:
        "The 'default' profile is required when using Solidity build profiles",
      path: ["solidity", "profiles"],
    });
  }

  return result;
}

export async function resolveSolidityUserConfig(
  userConfig: HardhatUserConfig,
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfig> {
  let sourcesPaths = userConfig.paths?.sources;

  // TODO: use isObject when the type narrowing issue is fixed
  sourcesPaths =
    typeof sourcesPaths === "object" && !Array.isArray(sourcesPaths)
      ? sourcesPaths.solidity
      : sourcesPaths;

  sourcesPaths ??= "contracts";

  sourcesPaths = Array.isArray(sourcesPaths) ? sourcesPaths : [sourcesPaths];

  const resolvedPaths = sourcesPaths.map((p) =>
    resolveFromRoot(resolvedConfig.paths.root, p),
  );

  return {
    ...resolvedConfig,
    paths: {
      ...resolvedConfig.paths,
      sources: {
        ...resolvedConfig.paths.sources,
        solidity: resolvedPaths,
      },
    },
    solidity: resolveSolidityConfig(userConfig.solidity ?? "0.8.0"),
  };
}

function resolveSolidityConfig(
  solidityConfig: SolidityUserConfig,
): SolidityConfig {
  if (typeof solidityConfig === "string") {
    solidityConfig = [solidityConfig];
  }

  if (Array.isArray(solidityConfig)) {
    return {
      profiles: {
        default: {
          compilers: solidityConfig.map((version) => ({
            version,
            settings: {},
          })),
          overrides: {},
        },
      },
      dependenciesToCompile: [],
      remappings: [],
      test: {},
    };
  }

  if ("version" in solidityConfig) {
    return {
      profiles: {
        default: {
          compilers: [
            {
              version: solidityConfig.version,
              settings: solidityConfig.settings ?? {},
            },
          ],
          overrides: {},
        },
      },
      dependenciesToCompile: solidityConfig.dependenciesToCompile ?? [],
      remappings: solidityConfig.remappings ?? [],
      test: solidityConfig.test ?? {},
    };
  }

  if ("compilers" in solidityConfig) {
    return {
      profiles: {
        default: {
          compilers: solidityConfig.compilers.map((compiler) => ({
            version: compiler.version,
            settings: compiler.settings ?? {},
          })),
          overrides: Object.fromEntries(
            Object.entries(solidityConfig.overrides ?? {}).map(
              ([sourceName, override]) => {
                return [
                  sourceName,
                  {
                    version: override.version,
                    settings: override.settings ?? {},
                  },
                ];
              },
            ),
          ),
        },
      },
      dependenciesToCompile: solidityConfig.dependenciesToCompile ?? [],
      remappings: solidityConfig.remappings ?? [],
      test: solidityConfig.test ?? {},
    };
  }

  const profiles: Record<string, SolidityBuildProfileConfig> = {};

  // TODO: Merge the profiles
  for (const [profileName, profile] of Object.entries(
    solidityConfig.profiles,
  )) {
    if ("version" in profile) {
      profiles[profileName] = {
        compilers: [
          {
            version: profile.version,
            settings: profile.settings ?? {},
          },
        ],
        overrides: {},
      };
      continue;
    }

    profiles[profileName] = {
      compilers: profile.compilers.map((compiler) => ({
        version: compiler.version,
        settings: compiler.settings ?? {},
      })),
      overrides: Object.fromEntries(
        Object.entries(profile.overrides ?? {}).map(
          ([sourceName, override]) => {
            return [
              sourceName,
              {
                version: override.version,
                settings: override.settings ?? {},
              },
            ];
          },
        ),
      ),
    };
  }

  for (const profile of DEFAULT_BUILD_PROFILES) {
    if (!(profile in profiles)) {
      profiles[profile] = profiles.default;
    }
  }

  return {
    profiles,
    dependenciesToCompile: solidityConfig.dependenciesToCompile ?? [],
    remappings: solidityConfig.remappings ?? [],
    test: solidityConfig.test ?? {},
  };
}
