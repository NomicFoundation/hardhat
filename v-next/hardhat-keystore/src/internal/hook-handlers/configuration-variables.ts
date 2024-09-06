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
  // Undefined means that the loader has not been initialized yet.
  // Null means that the Keystore has been initialized but the file does not exist, so the loading process is skipped.
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

      if (!(await keystoreLoader.exists())) {
        return next(context, variable);
      }

      const keystore = await keystoreLoader.load();

      if (!(await keystore.hasKey(variable.name))) {
        return next(context, variable);
      }

      const value = await keystore.readValue(variable.name);

      return value ?? next(context, variable);
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
