import type { KeystoreLoader } from "../types.js";
import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { isCi } from "@ignored/hardhat-vnext-utils/ci";

import { deriveMasterKeyFromKeystore } from "../keystores/encryption.js";
import { askPassword } from "../keystores/password.js";
import { setupKeystoreLoaderFrom } from "../utils/setup-keystore-loader-from.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  // Use a cache with hooks since they may be called multiple times consecutively.
  let keystoreLoader: KeystoreLoader | undefined;
  // Caching the masterKey prevents repeated password prompts when retrieving multiple configuration variables.
  let masterKey: Uint8Array | undefined;

  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      // If we are in CI, the keystore should not be used
      // or even initialized
      if (isCi()) {
        return next(context, variable);
      }

      if (keystoreLoader === undefined) {
        keystoreLoader = setupKeystoreLoaderFrom(context);
      }

      if (!(await keystoreLoader.isKeystoreInitialized())) {
        return next(context, variable);
      }

      const keystore = await keystoreLoader.loadKeystore();

      if (!(await keystore.hasKey(variable.name))) {
        return next(context, variable);
      }

      if (masterKey === undefined) {
        const password = await askPassword(
          context.interruptions.requestSecretInput.bind(context.interruptions),
        );

        masterKey = deriveMasterKeyFromKeystore({
          encryptedKeystore: keystore.toJSON(),
          password,
        });
      }

      return keystore.readValue(variable.name, masterKey);
    },
  };

  return handlers;
};
