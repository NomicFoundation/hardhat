import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "../../../../types/hooks.js";

import {
  resolveSolidityUserConfig,
  validateSolidityUserConfig,
} from "../config.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) =>
      validateSolidityUserConfig(userConfig),
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const resolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return resolveSolidityUserConfig(userConfig, resolvedConfig);
    },
    validateResolvedConfig: async (resolvedConfig) => {
      const errors: HardhatUserConfigValidationError[] = [];
      const registered = new Set(
        resolvedConfig.solidity.registeredCompilerTypes,
      );

      for (const [profileName, profile] of Object.entries(
        resolvedConfig.solidity.profiles,
      )) {
        for (const [i, compiler] of profile.compilers.entries()) {
          const type = compiler.type ?? "solc";
          if (!registered.has(type)) {
            errors.push({
              path: [
                "solidity",
                "profiles",
                profileName,
                "compilers",
                i,
                "type",
              ],
              message: `Unknown compiler type "${type}". Registered types: ${[...registered].join(", ")}`,
            });
          }
        }
        for (const [sourceName, override] of Object.entries(
          profile.overrides,
        )) {
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
    },
  };

  return handlers;
};
