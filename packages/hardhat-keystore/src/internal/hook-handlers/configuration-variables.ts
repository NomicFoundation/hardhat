import type { deriveMasterKeyFromKeystore as deriveMasterKeyFromKeystoreT } from "../keystores/encryption.js";
import type { getPasswordHandlers as getPasswordHandlersT } from "../keystores/password.js";
import type { KeystoreLoader } from "../types.js";
import type { setupKeystoreLoaderFrom as setupKeystoreLoaderFromT } from "../utils/setup-keystore-loader-from.js";
import type { ConfigurationVariable } from "hardhat/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "hardhat/types/hooks";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";

// Split into two lazy stages so fetchValue calls that don't reach the
// master-key derivation skip loading the heavy crypto modules.
// - Stage 1 loads only the keystore-loader factory.
// - Stage 2 (the crypto modules) only runs after `isKeystoreInitialized()` passes.

let setupKeystoreLoaderFromPromise:
  | Promise<{ setupKeystoreLoaderFrom: typeof setupKeystoreLoaderFromT }>
  | undefined;

let cryptoModulesPromise:
  | Promise<{
      deriveMasterKeyFromKeystore: typeof deriveMasterKeyFromKeystoreT;
      getPasswordHandlers: typeof getPasswordHandlersT;
    }>
  | undefined;

function loadSetupKeystoreLoaderFrom() {
  if (setupKeystoreLoaderFromPromise === undefined) {
    setupKeystoreLoaderFromPromise = import(
      "../utils/setup-keystore-loader-from.js"
    );
  }

  return setupKeystoreLoaderFromPromise;
}

function loadCryptoModules() {
  if (cryptoModulesPromise === undefined) {
    cryptoModulesPromise = Promise.all([
      import("../keystores/encryption.js"),
      import("../keystores/password.js"),
    ]).then(([encryptionMod, passwordMod]) => ({
      deriveMasterKeyFromKeystore: encryptionMod.deriveMasterKeyFromKeystore,
      getPasswordHandlers: passwordMod.getPasswordHandlers,
    }));
  }

  return cryptoModulesPromise;
}

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  // Use a cache with hooks since they may be called multiple times consecutively.
  let keystoreLoaderProd: KeystoreLoader | undefined;
  let keystoreLoaderDev: KeystoreLoader | undefined;
  // Caching the masterKey prevents repeated password prompts when retrieving multiple configuration variables.
  let masterKeyProd: Uint8Array | undefined;
  let masterKeyDev: Uint8Array | undefined;

  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      // If we are in CI, the keystore should not be used
      // or even initialized
      if (isCi()) {
        return await next(context, variable);
      }

      // First try to get the value from the development keystore
      let value = await getValue(context, variable, true);

      if (value !== undefined) {
        return value;
      }

      if (process.env.HH_TEST === "true") {
        // When `fetchValue` is called from a test, we only allow the use of the development keystore
        // to avoid prompting for the production keystore password.
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.KEY_NOT_FOUND_DURING_TESTS_WITH_DEV_KEYSTORE,
          {
            key: variable.name,
          },
        );
      }

      // Then, if the development keystore does not have the key and `fetchValue` is not called from a test,
      // attempt to retrieve the value from the production keystore.
      value = await getValue(context, variable, false);

      if (value !== undefined) {
        return value;
      }

      return await next(context, variable);
    },
  };

  async function getValue(
    context: HookContext,
    variable: ConfigurationVariable,
    isDevKeystore: boolean,
  ): Promise<string | undefined> {
    let keystoreLoader = isDevKeystore ? keystoreLoaderDev : keystoreLoaderProd;
    let masterKey = isDevKeystore ? masterKeyDev : masterKeyProd;

    if (keystoreLoader === undefined) {
      const { setupKeystoreLoaderFrom } = await loadSetupKeystoreLoaderFrom();
      keystoreLoader = setupKeystoreLoaderFrom(context, isDevKeystore);

      if (isDevKeystore) {
        keystoreLoaderDev = keystoreLoader;
      } else {
        keystoreLoaderProd = keystoreLoader;
      }
    }

    if (!(await keystoreLoader.isKeystoreInitialized())) {
      return undefined;
    }

    const keystore = await keystoreLoader.loadKeystore();

    if (masterKey === undefined) {
      const { deriveMasterKeyFromKeystore, getPasswordHandlers } =
        await loadCryptoModules();

      const { askPassword } = getPasswordHandlers(
        context.interruptions.requestSecretInput.bind(context.interruptions),
        console.log,
        isDevKeystore,
        keystoreLoader.getKeystoreDevPasswordFilePath(),
      );

      const password = await askPassword();

      masterKey = deriveMasterKeyFromKeystore({
        encryptedKeystore: keystore.toJSON(),
        password,
      });

      if (isDevKeystore) {
        masterKeyDev = masterKey;
      } else {
        masterKeyProd = masterKey;
      }
    }

    if (!(await keystore.hasKey(variable.name, masterKey))) {
      return undefined;
    }

    return await keystore.readValue(variable.name, masterKey);
  }

  return handlers;
};
