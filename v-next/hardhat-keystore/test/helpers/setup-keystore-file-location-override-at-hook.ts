import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { FILE_PATH } from "./setup-keystore-file-location-override-at.js";

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

      return {
        ...resolvedConfig,
        keystore: {
          filePath: FILE_PATH[0],
        },
      };
    },
  };

  return handlers;
};
