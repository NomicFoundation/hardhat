import type { ConfigHooks } from "../../../../types/hooks.js";

import {
  resolveSolidityTestUserConfig,
  validateSolidityTestUserConfig,
} from "../config.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) =>
      validateSolidityTestUserConfig(userConfig),
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const resolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return resolveSolidityTestUserConfig(userConfig, resolvedConfig);
    },
  };

  return handlers;
};
