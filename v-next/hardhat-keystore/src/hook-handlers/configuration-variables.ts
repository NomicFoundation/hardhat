import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext/types/hooks";

import { UnencryptedKeystoreLoader } from "../keystores/unencrypted-keystore-loader.js";
import get from "../tasks/get.js";
import { RawInterruptionsImpl } from "../ui/io.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const interruptions = new RawInterruptionsImpl();
      const loader = new UnencryptedKeystoreLoader(interruptions);

      const hasKeystore = await loader.hasKeystore();
      if (!hasKeystore) {
        return next(context, variable);
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this is temporary as part of a refactor
      const value = await get({ key: variable.name }, null as any);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};
