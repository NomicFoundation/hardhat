import type { HardhatUserConfig } from "../../../config.js";
import type {
  HardhatConfig,
  MultiVersionSolidityUserConfig,
  SingleVersionSolidityUserConfig,
  SolcConfig,
  SolcUserConfig,
  SolidityBuildProfileConfig,
  SolidityConfig,
  SolidityUserConfig,
} from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { deepMerge, isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import {
  conditionalUnionType,
  incompatibleFieldType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import { DEFAULT_BUILD_PROFILES } from "./build-profiles.js";
import {
  hasOfficialArm64Build,
  missesSomeOfficialNativeBuilds,
} from "./build-system/solc-info.js";

const sourcePathsType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string()],
    [(data) => Array.isArray(data), z.array(z.string()).nonempty()],
  ],
  "Expected a string or an array of strings",
);

const commonSolcUserConfigType = z.object({
  isolated: z.boolean().optional(),
});

const solcUserConfigType = z.object({
  version: z.string(),
  settings: z.any().optional(),
  path: z.string().optional(),
  preferWasm: z.boolean().optional(),
  compilers: incompatibleFieldType("This field is incompatible with `version`"),
  overrides: incompatibleFieldType("This field is incompatible with `version`"),
  profiles: incompatibleFieldType("This field is incompatible with `version`"),
});

// NOTE: This is only to match the setup present in ./type-extensions.ts
const singleVersionSolcUserConfigType = solcUserConfigType.extend({
  isolated: z.boolean().optional(),
  preferWasm: z.boolean().optional(),
});

const multiVersionSolcUserConfigType = commonSolcUserConfigType.extend({
  compilers: z.array(solcUserConfigType).nonempty(),
  overrides: z.record(z.string(), solcUserConfigType).optional(),
  isolated: z.boolean().optional(),
  preferWasm: z.boolean().optional(),
  version: incompatibleFieldType("This field is incompatible with `compilers`"),
  settings: incompatibleFieldType(
    "This field is incompatible with `compilers`",
  ),
});

const commonSolidityUserConfigType = z.object({
  npmFilesToBuild: z.array(z.string()).optional(),
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
  "Expected a version string, an array of version strings, or an object configuring one or more versions of Solidity or multiple build profiles",
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

  // user provided an array of versions or a single version
  if (Array.isArray(solidityConfig)) {
    const defaultSolidityConfig = {
      compilers: solidityConfig.map((version) => ({ version })),
    };
    return {
      profiles: {
        default: resolveBuildProfileConfig(defaultSolidityConfig),
        production: resolveBuildProfileConfig(
          copyFromDefault(defaultSolidityConfig),
          true,
        ),
      },
      npmFilesToBuild: [],
    };
  }

  // user provided a single version config or a multi version config
  if ("version" in solidityConfig || "compilers" in solidityConfig) {
    return {
      profiles: {
        default: resolveBuildProfileConfig(solidityConfig),
        production: resolveBuildProfileConfig(
          copyFromDefault(solidityConfig),
          true,
        ),
      },
      npmFilesToBuild: solidityConfig.npmFilesToBuild ?? [],
    };
  }

  // user provided a build profiles config
  const profiles: Record<string, SolidityBuildProfileConfig> = {};

  for (const [profileName, profile] of Object.entries(
    solidityConfig.profiles,
  )) {
    profiles[profileName] = resolveBuildProfileConfig(
      profile,
      profileName === "production",
    );
  }

  // This will generate default build profiles (e.g. production) when they are
  // not specified in the config, cloning from 'default', which is always present
  for (const profile of DEFAULT_BUILD_PROFILES) {
    if (!(profile in profiles)) {
      profiles[profile] = resolveBuildProfileConfig(
        copyFromDefault(solidityConfig.profiles.default),
        profile === "production",
      );
    }
  }

  return {
    profiles,
    npmFilesToBuild: solidityConfig.npmFilesToBuild ?? [],
  };
}

function resolveBuildProfileConfig(
  solidityConfig:
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig,
  production: boolean = false,
): SolidityBuildProfileConfig {
  if ("version" in solidityConfig) {
    return {
      compilers: [resolveSolcConfig(solidityConfig, production)],
      overrides: {},
      isolated: solidityConfig.isolated ?? production,
      preferWasm: solidityConfig.preferWasm ?? false,
    };
  }

  return {
    compilers: solidityConfig.compilers.map((compiler) =>
      resolveSolcConfig(compiler, production),
    ),
    overrides: Object.fromEntries(
      Object.entries(solidityConfig.overrides ?? {}).map(
        ([userSourceName, override]) => [
          userSourceName,
          resolveSolcConfig(override, production),
        ],
      ),
    ),
    isolated: solidityConfig.isolated ?? production,
    preferWasm: solidityConfig.preferWasm ?? false,
  };
}

function resolveSolcConfig(
  solcConfig: SolcUserConfig,
  production: boolean = false,
): SolcConfig {
  const defaultSolcConfigSettings: SolcConfig["settings"] = {
    outputSelection: {
      "*": {
        "": ["ast"],
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers",
          "metadata",
        ],
      },
    },
  };

  if (production) {
    defaultSolcConfigSettings.optimizer = {
      enabled: true,
      runs: 200,
    };
  }

  // Resolve per-compiler preferWasm:
  // If explicitly set, use that value.
  // Otherwise, for ARM64 Linux, default to true only for versions
  // without official ARM64 builds.
  let resolvedPreferWasm: boolean | undefined = solcConfig.preferWasm;
  if (resolvedPreferWasm === undefined && shouldUseWasm()) {
    resolvedPreferWasm = !hasOfficialArm64Build(solcConfig.version);
  }

  return {
    version: solcConfig.version,
    settings: deepMerge(defaultSolcConfigSettings, solcConfig.settings ?? {}),
    path: solcConfig.path,
    preferWasm: resolvedPreferWasm,
  };
}

function copyFromDefault(
  defaultSolidityConfig:
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig,
): SingleVersionSolidityUserConfig | MultiVersionSolidityUserConfig {
  if ("version" in defaultSolidityConfig) {
    return {
      version: defaultSolidityConfig.version,
    };
  }

  return {
    compilers: defaultSolidityConfig.compilers.map((c) => ({
      version: c.version,
    })),
    overrides: Object.fromEntries(
      Object.entries(defaultSolidityConfig.overrides ?? {}).map(
        ([userSourceName, override]) => [
          userSourceName,
          { version: override.version },
        ],
      ),
    ),
  };
}
