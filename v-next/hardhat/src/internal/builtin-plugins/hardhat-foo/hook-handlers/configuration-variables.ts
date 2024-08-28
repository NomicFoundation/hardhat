import type { ConfigurationVariableHooks } from "@ignored/hardhat-vnext-core/types/hooks";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (_context, _variable, _next) => {
      // TODO: when implementing this function, these keystore tests will fail:
      // - "should invoke the next function because no keystore is found"
      // - "should invoke the next function because the keystore is found but the key is not present"
      return "value-from-hardhat-package";
    },
  };

  return handlers;
};
