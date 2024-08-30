import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { get } from "../tasks/get.js";
import { HookRawInterruptionsImpl } from "../ui/raw-interruptions.js";
import { getKeystoreFilePath } from "../utils/get-keystore-file-path.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const loader = await _setupHookContextUsingKeystoreLoader(context);

      const keystore = await loader.load();
      if (keystore === undefined) {
        return next(context, variable);
      }

      const value = await get({ key: variable.name }, loader, interruptions);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};

async function _setupHookContextUsingKeystoreLoader(context: HookContext) {
  const keystoreFilePath = await getKeystoreFilePath();
  const interruptions = new HookRawInterruptionsImpl(context);
  return new UnencryptedKeystoreLoader(keystoreFilePath, interruptions);
}
