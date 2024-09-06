import type { KeystoreLoader } from "../types.js";
import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { FileManagerImpl } from "../loaders/file-manager.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  // Use a cache with hooks since they may be called multiple times consecutively.
  let keystoreLoader: KeystoreLoader | undefined;

  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      if (keystoreLoader === undefined) {
        keystoreLoader =
          await _setupLoaderWithContextBasedUserInterruptions(context);
      }

      if (!(await keystoreLoader.isKeystoreUninitialized())) {
        return next(context, variable);
      }

      const keystore = await keystoreLoader.loadKeystore();

      if (!(await keystore.hasKey(variable.name))) {
        return next(context, variable);
      }

      return keystore.readValue(variable.name);
    },
  };

  return handlers;
};

async function _setupLoaderWithContextBasedUserInterruptions(
  context: HookContext,
) {
  const keystoreFilePath = context.config.keystore.filePath;
  const fileManager = new FileManagerImpl();

  return new KeystoreFileLoader(keystoreFilePath, fileManager);
}
