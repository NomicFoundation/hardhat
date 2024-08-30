import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import { get } from "../tasks/get.js";
import { HookRawInterruptionsImpl } from "../ui/raw-interruptions.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const interruptions = new HookRawInterruptionsImpl(context);
      const loader = new UnencryptedKeystoreLoader(interruptions);

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
