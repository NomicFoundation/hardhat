import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { validateUserConfigZodType } from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

const keystoreConfigType = z.object({
  filePath: z.string().optional(),
});

const userConfigType = z.object({
  keystore: z.optional(keystoreConfigType),
});

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
      return validateUserConfigZodType(userConfig, userConfigType);
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

      const defaultKeystoreFilePath = await getKeystoreFilePath();

      return {
        ...resolvedConfig,
        keystore: {
          filePath: defaultKeystoreFilePath,
        },
      };
    },
  };

  return handlers;
};
