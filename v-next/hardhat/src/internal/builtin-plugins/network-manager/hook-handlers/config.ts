import type { ConfigHooks } from "@ignored/hardhat-vnext-core/types/hooks";

import { validateUserConfig } from "../type-validation.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig: async (userConfig, resolveConfigurationVariable, next) => {
    const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

    return {
      ...resolvedConfig,
    };
  },
});
