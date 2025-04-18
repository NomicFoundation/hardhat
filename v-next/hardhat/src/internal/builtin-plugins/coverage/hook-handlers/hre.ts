import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      const { CoverageManagerImplementation } = await import(
        "../coverage-manager.js"
      );
      hre.coverage = await CoverageManagerImplementation.getOrCreate();
    },
  };

  return handlers;
};
