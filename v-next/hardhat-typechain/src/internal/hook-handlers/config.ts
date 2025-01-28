import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { getConfig } from "../config/get-config.js";
import { validateTypechainUserConfig } from "../config/validation.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: validateTypechainUserConfig,
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
        typechain: getConfig(userConfig.typechain),
      };
    },
  };

  return handlers;
};
