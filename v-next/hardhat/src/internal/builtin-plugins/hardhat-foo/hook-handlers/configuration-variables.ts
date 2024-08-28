import type { ConfigurationVariableHooks } from "@ignored/hardhat-vnext-core/types/hooks";

export default async (): Promise<Partial<ConfigurationVariableHooks>> => {
  const handlers: Partial<ConfigurationVariableHooks> = {
    fetchValue: async (context, variable, _next) => {
      return context.interruptions.requestSecretInput(
        "Plugin that overrides the config vars resolution",
        variable.name,
      );
    },
  };

  return handlers;
};
