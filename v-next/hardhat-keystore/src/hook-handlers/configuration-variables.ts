import type { Keystore } from "../types.js";
import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { UserInteractions } from "../ui/user-interactions.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  // Use a cache with hooks since they may be called multiple times consecutively.
  // Undefined means that the loader has not been initialized yet.
  // Null means that the Keystore has been initialized but the file does not exist, so the loading process is skipped.
  let keystoreCache: Keystore | undefined | null;

  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      if (keystoreCache === undefined) {
        const loader =
          await _setupLoaderWithContextBasedUserInterruptions(context);

        keystoreCache = (await loader.exists()) ? await loader.load() : null;
      }

      if (keystoreCache === null) {
        return next(context, variable);
      }

      const value = await keystoreCache.readValue(variable.name);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};

async function _setupLoaderWithContextBasedUserInterruptions(
  context: HookContext,
) {
  const keystoreFilePath = context.config.keystore.filePath;
  const userInteractions = new UserInteractions(context.interruptions);

  return new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(userInteractions),
  );
}
