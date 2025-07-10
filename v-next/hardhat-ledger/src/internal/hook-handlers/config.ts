import type { ConfigHooks } from "hardhat/types/hooks";

import { resolveLedgerUserConfig } from "../config/resolution.js";
import { validateLedgerUserConfig } from "../config/validation.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) =>
      validateLedgerUserConfig(userConfig),
    resolveUserConfig: async (
      userConfig,
      resolveConfigurationVariable,
      next,
    ) => {
      const resolvedConfig = await next(
        userConfig,
        resolveConfigurationVariable,
      );

      return resolveLedgerUserConfig(userConfig, resolvedConfig);
    },
  };

  return handlers;
};
