import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../loaders/keystore-file-loader.js";
import { HookRawInterruptionsImpl } from "../ui/HookRawInterruptionsImpl.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const loader = await _setupHookContextUsingKeystoreLoader();

      if (!(await loader.exists())) {
        return next(context, variable);
      }

      const keystore = await loader.load();

      const value = await keystore.readValue(variable.name);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};

async function _setupHookContextUsingKeystoreLoader() {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new HookRawInterruptionsImpl();
  return new KeystoreFileLoader(
    keystoreFilePath,
    () => new UnencryptedKeystore(interruptions),
  );
}
