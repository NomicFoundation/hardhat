import type { ConfigurationVariable } from "@ignored/hardhat-vnext-core/types/config";
import type {
  ConfigurationVariableHooks,
  HookContext,
} from "@ignored/hardhat-vnext-core/types/hooks";

import { get } from "../methods.js";
import { getKeystore } from "../utils.js";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (
      context: HookContext,
      variable: ConfigurationVariable,
      next,
    ) => {
      const keystores = await getKeystore();

      if (keystores === undefined) {
        return next(context, variable);
      }

      const value = await get(variable.name);

      return value ?? next(context, variable);
    },
  };

  return handlers;
};
