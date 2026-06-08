import type { ConfigHooks } from "../../../../types/hooks.js";

import {
  resolveCoverageConfig,
  validateCoverageUserConfig,
} from "../config.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) =>
      validateCoverageUserConfig(userConfig),
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const resolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return {
        ...resolvedConfig,
        coverage: resolveCoverageConfig(userConfig),
      };
    },
  };

  return handlers;
};
