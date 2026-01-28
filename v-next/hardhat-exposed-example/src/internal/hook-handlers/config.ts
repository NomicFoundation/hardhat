import type { ConfigHooks } from "hardhat/types/hooks";

import { resolvePluginConfig, validatePluginConfig } from "../config.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
      return validatePluginConfig(userConfig);
    },
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const partiallyResolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return resolvePluginConfig(userConfig, partiallyResolvedConfig);
    },
  };

  return handlers;
};
