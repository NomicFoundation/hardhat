import type { ConfigHooks } from "../../../../types/hooks.js";

import {
  resolveSolidityUserConfig,
  validateSolidityConfig,
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

      return await resolveSolidityUserConfig(userConfig, resolvedConfig);
    },
    validateResolvedConfig: async (resolvedConfig) =>
      validateSolidityConfig(resolvedConfig),
  };

  return handlers;
};
