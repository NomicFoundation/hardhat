import type { HardhatUserConfig } from "../../../config.js";
import type {
  SolidityCompilerConfig,
  SolidityCompilerUserConfig,
  HardhatConfig,
  MultiVersionSolidityUserConfig,
  SingleVersionSolidityUserConfig,
  SolidityBuildProfileConfig,
  SolidityConfig,
  SolidityUserConfig,
  CommonSolidityCompilerUserConfig,
  SolcSolidityCompilerConfig,
  SolcSolidityCompilerUserConfig,
} from "../../../types/config.js";
import type {
  HardhatConfigValidationError,
  HardhatUserConfigValidationError,
} from "../../../types/hooks.js";

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
  hasArm64MirrorBuild,
  hasOfficialArm64Build,
  missesSomeOfficialNativeBuilds,
} from "./build-system/solc-info.js";

/**
 * The top-level type SolidityUserConfig is a union type too complex for
 * TypeScript to handle properly. It accepts fields of different types of
 * configurations. For example, it accepts `compilers` inside of a
 * `SingleVersionSolidityUserConfig`.
 *
 * For this reason, we declare all the fields that shouldn't exist in the
 * presence of another one as incompatible.
 *
 * This object has all the fields that are incompatible with `version`.
 */
const incompatibleVersionFields = {
  compilers: incompatibleFieldType("This field is incompatible with `version`"),
  overrides: incompatibleFieldType("This field is incompatible with `version`"),
  profiles: incompatibleFieldType("This field is incompatible with `version`"),
};

/**
 * This is the equivalent of `incompatibleVersionFields`, but for the
 * `profiles` field.
 */
const incompatibleProfileFields = {
  type: incompatibleFieldType("This field is incompatible with `profiles`"),
  version: incompatibleFieldType("This field is incompatible with `profiles`"),
  compilers: incompatibleFieldType(
    "This field is incompatible with `profiles`",
  ),
  overrides: incompatibleFieldType(
    "This field is incompatible with `profiles`",
  ),
};

/**
 * This is the equivalent of `incompatibleVersionFields`, but for the
 * `compilers` field.
 */
const incompatibleCompilerFields = {
  type: incompatibleFieldType("This field is incompatible with `compilers`"),
  version: incompatibleFieldType("This field is incompatible with `compilers`"),
  profiles: incompatibleFieldType(
    "This field is incompatible with `compilers`",
  ),
};

const commonSolidityUserConfigFields = {
  isolated: z.boolean().optional(),
  npmFilesToBuild: z.array(z.string()).optional(),
};

const commonSolidityCompilerUserConfigFields = {
  type: z.string().optional(),
  version: z.string(),
  settings: z.any().optional(),
  path: z.string().optional(),
};

const solcSolidityCompilerUserConfigType = z.object({
  ...commonSolidityCompilerUserConfigFields,
  type: z.literal("solc").optional(),
  preferWasm: z.boolean().optional(),
});

const otherSolidityCompilerUserConfigType = z.object(
  commonSolidityCompilerUserConfigFields,
);

// Per-compiler config: preferWasm is only allowed for solc (type undefined or "solc")
const solidityCompilerUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) &&
        (!("type" in data) || data.type === undefined || data.type === "solc"),
      solcSolidityCompilerUserConfigType,
    ],
    [
      (data) => isObject(data) && "type" in data && data.type !== "solc",
      otherSolidityCompilerUserConfigType,
    ],
  ],
  "Expected a valid compiler configuration",
);

const solcSingleVersionSolidityUserConfigType =
  solcSolidityCompilerUserConfigType.extend({
    ...commonSolidityUserConfigFields,
    ...incompatibleVersionFields,
  });

const otherSingleVersionSolidityUserConfigType =
  otherSolidityCompilerUserConfigType.extend({
    ...commonSolidityUserConfigFields,
    ...incompatibleVersionFields,
  });

const singleVersionSolidityUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) &&
        (!("type" in data) || data.type === undefined || data.type === "solc"),
      solcSingleVersionSolidityUserConfigType,
    ],
    [
      (data) => isObject(data) && "type" in data && data.type !== "solc",
      otherSingleVersionSolidityUserConfigType,
    ],
  ],
  "Expected a valid single-version Solidity configuration",
);

const multiVersionSolidityUserConfigType = z.object({
  preferWasm: z.boolean().optional(),
  compilers: z.array(solidityCompilerUserConfigType).nonempty(),
  overrides: z.record(z.string(), solidityCompilerUserConfigType).optional(),
  ...commonSolidityUserConfigFields,
  ...incompatibleCompilerFields,
});

// This definition needs to be aligned with solidityCompilerUserConfigType.
// The reason to duplicate it is that we can't `.extend()` a conditional union
// type.
const singleVersionBuildProfileUserConfigType = conditionalUnionType(
  [
    [
      (data) =>
        isObject(data) &&
        (!("type" in data) || data.type === undefined || data.type === "solc"),
      solcSolidityCompilerUserConfigType.extend({
        isolated: z.boolean().optional(),
        ...incompatibleVersionFields,
      }),
    ],
    [
      (data) => isObject(data) && "type" in data && data.type !== "solc",
      otherSolidityCompilerUserConfigType.extend({
        isolated: z.boolean().optional(),
        ...incompatibleVersionFields,
      }),
    ],
  ],
  "Expected a valid compiler configuration",
);

const multiVersionBuildProfileUserConfigType = z.object({
  preferWasm: z.boolean().optional(),
  compilers: z.array(solidityCompilerUserConfigType).nonempty(),
  overrides: z.record(z.string(), solidityCompilerUserConfigType).optional(),
  isolated: z.boolean().optional(),
  ...incompatibleCompilerFields,
});

const buildProfilesSolidityUserConfigType = z.object({
  profiles: z.record(
    z.string(),
    conditionalUnionType(
      [
        [
          (data) => isObject(data) && "version" in data,
          singleVersionBuildProfileUserConfigType,
        ],
        [
          (data) => isObject(data) && "compilers" in data,
          multiVersionBuildProfileUserConfigType,
        ],
      ],
      "Expected an object configuring one or more versions of Solidity",
    ),
  ),
  ...incompatibleProfileFields,
});

const solidityUserConfigType = conditionalUnionType(
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

const sourcePathsType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string()],
    [(data) => Array.isArray(data), z.array(z.string()).nonempty()],
  ],
  "Expected a string or an array of strings",
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
  solidity: solidityUserConfigType.optional(),
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

export function validateSolidityConfig(
  resolvedConfig: HardhatConfig,
): HardhatConfigValidationError[] {
  const errors: HardhatConfigValidationError[] = [];

  errors.push(...validateRegisteredCompilerTypes(resolvedConfig));
  errors.push(...validatePreferWasmRequiresSolc(resolvedConfig));

  return errors;
}

function validateRegisteredCompilerTypes(
  resolvedConfig: HardhatConfig,
): HardhatConfigValidationError[] {
  const errors: HardhatConfigValidationError[] = [];
  const registered = new Set(resolvedConfig.solidity.registeredCompilerTypes);

  for (const [profileName, profile] of Object.entries(
    resolvedConfig.solidity.profiles,
  )) {
    for (const [i, compiler] of profile.compilers.entries()) {
      const type = compiler.type ?? "solc";
      if (!registered.has(type)) {
        errors.push({
          path: ["solidity", "profiles", profileName, "compilers", i, "type"],
          message: `Unknown compiler type "${type}". Registered types: ${[...registered].join(", ")}`,
        });
      }
    }
    for (const [sourceName, override] of Object.entries(profile.overrides)) {
      const type = override.type ?? "solc";
      if (!registered.has(type)) {
        errors.push({
          path: [
            "solidity",
            "profiles",
            profileName,
            "overrides",
            sourceName,
            "type",
          ],
          message: `Unknown compiler type "${type}". Registered types: ${[...registered].join(", ")}`,
        });
      }
    }
  }

  return errors;
}

function validatePreferWasmRequiresSolc(
  resolvedConfig: HardhatConfig,
): HardhatConfigValidationError[] {
  const errors: HardhatConfigValidationError[] = [];

  for (const [profileName, profile] of Object.entries(
    resolvedConfig.solidity.profiles,
  )) {
    if (!profile.preferWasm) {
      continue;
    }

    for (const [i, compiler] of profile.compilers.entries()) {
      const type = compiler.type;
      if (type !== undefined && type !== "solc") {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We need to cast because within Hardhat core the type of `type` is
        `never`, as you can only get into this if with a plugin. */
        const compilerType: string = (compiler as any).type;

        errors.push({
          path: ["solidity", "profiles", profileName, "compilers", i, "type"],
          message: `Compiler type must be "solc" if \`preferWasm\` is \`true\` in the build profile, but found type "${compilerType}"`,
        });
      }
    }

    for (const [sourceName, override] of Object.entries(profile.overrides)) {
      const type = override.type;
      if (type !== undefined && type !== "solc") {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We need to cast because within Hardhat core the type of `type` is
        `never`, as you can only get into this if with a plugin. */
        const overrideType: string = (override as any).type;

        errors.push({
          path: [
            "solidity",
            "profiles",
            profileName,
            "overrides",
            sourceName,
            "type",
          ],
          message: `Compiler type must be "solc" if \`preferWasm\` is \`true\` in the build profile, but found type "${overrideType}"`,
        });
      }
    }
  }

  return errors;
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
      registeredCompilerTypes: ["solc"],
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
      registeredCompilerTypes: ["solc"],
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
    registeredCompilerTypes: ["solc"],
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
      compilers: [resolveSolidityCompilerConfig(solidityConfig, production)],
      overrides: {},
      isolated: solidityConfig.isolated ?? production,
      preferWasm: solidityConfig.preferWasm ?? false,
    };
  }

  return {
    compilers: solidityConfig.compilers.map((compiler) =>
      resolveSolidityCompilerConfig(compiler, production),
    ),
    overrides: Object.fromEntries(
      Object.entries(solidityConfig.overrides ?? {}).map(
        ([userSourceName, override]) => [
          userSourceName,
          resolveSolidityCompilerConfig(override, production),
        ],
      ),
    ),
    isolated: solidityConfig.isolated ?? production,
    preferWasm: solidityConfig.preferWasm ?? false,
  };
}

function resolveSolidityCompilerConfig(
  compilerConfig: SolidityCompilerUserConfig,
  production: boolean = false,
): SolidityCompilerConfig {
  const defaultSettings: SolidityCompilerConfig["settings"] = {
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

  if (production && isSolcSolidityCompilerUserConfig(compilerConfig)) {
    defaultSettings.optimizer = {
      enabled: true,
      runs: 200,
    };
  }

  const resolvedSettings = deepMerge(
    defaultSettings,
    compilerConfig.settings ?? {},
  );

  // Resolve solc-specific preferWasm if this is a SolcSolidityCompilerUserConfig
  if (isSolcSolidityCompilerUserConfig(compilerConfig)) {
    // Resolve per-compiler preferWasm:
    // If explicitly set, use that value.
    // Otherwise, for ARM64 Linux:
    //   - Versions below the mirror threshold (< 0.5.0) always use WASM,
    //     since no native ARM64 build exists anywhere.
    //   - In production, versions without official ARM64 builds
    //     also default to WASM.
    let resolvedPreferWasm: boolean | undefined = compilerConfig.preferWasm;
    if (resolvedPreferWasm === undefined && missesSomeOfficialNativeBuilds()) {
      const version = compilerConfig.version;

      if (!hasOfficialArm64Build(version) && !hasArm64MirrorBuild(version)) {
        resolvedPreferWasm = true;
      } else if (production && !hasOfficialArm64Build(version)) {
        resolvedPreferWasm = true;
      }
    }
    const solcResolved: SolcSolidityCompilerConfig = {
      type: compilerConfig.type,
      version: compilerConfig.version,
      settings: resolvedSettings,
      path: compilerConfig.path,
      preferWasm: resolvedPreferWasm,
    };
    return solcResolved;
  }

  const unknownCompilerConfig =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We need to cast here because compilerConfig has `never` type here, as this
    case is only accessible when there are other types of compilers registered
    through plugins. */
    compilerConfig as unknown as CommonSolidityCompilerUserConfig;

  return {
    type: unknownCompilerConfig.type,
    version: unknownCompilerConfig.version,
    settings: resolvedSettings,
    path: unknownCompilerConfig.path,
  };
}

export function isSolcSolidityCompilerUserConfig(
  config: SolidityCompilerUserConfig,
): config is SolcSolidityCompilerUserConfig {
  return config.type === undefined || config.type === "solc";
}

function copyFromDefault(
  defaultSolidityConfig:
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig,
): SingleVersionSolidityUserConfig | MultiVersionSolidityUserConfig {
  if ("version" in defaultSolidityConfig) {
    return {
      version: defaultSolidityConfig.version,
      type: defaultSolidityConfig.type,
    };
  }

  return {
    compilers: defaultSolidityConfig.compilers.map((c) => ({
      version: c.version,
      type: c.type,
    })),
    overrides: Object.fromEntries(
      Object.entries(defaultSolidityConfig.overrides ?? {}).map(
        ([userSourceName, override]) => [
          userSourceName,
          { version: override.version, type: override.type },
        ],
      ),
    ),
  };
}
