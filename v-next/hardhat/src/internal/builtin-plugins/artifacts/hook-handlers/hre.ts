import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      const { ArtifactsManagerImplementation } = await import(
        "../artifacts-manager.js"
      );

      hre.artifacts = new ArtifactsManagerImplementation();
    },
  };

  return handlers;
};
