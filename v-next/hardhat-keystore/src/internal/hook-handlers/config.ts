import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

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
