import type { ConfigHooks } from "../../../../types/hooks.js";

import { resolveTestUserConfig } from "../config.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const resolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return await resolveTestUserConfig(userConfig, resolvedConfig);
    },
  };

  return handlers;
};
