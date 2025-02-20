import type { ConfigHooks } from "hardhat/types/hooks";

import debug from "debug";

import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

const log = debug("hardhat:keystore:hooks:config");

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

      log(`path to keystore file: ${defaultKeystoreFilePath}`);

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
