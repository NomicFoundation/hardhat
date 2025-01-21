import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { validateUserConfigZodType } from "@ignored/hardhat-vnext-zod-utils";

import { getConfig } from "../config/get-config.js";
import { typechainUserConfigSchema } from "../config/validation.js";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
      return validateUserConfigZodType(
        userConfig.typechain,
        typechainUserConfigSchema,
      );
    },
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
