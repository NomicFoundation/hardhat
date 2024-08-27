import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { ArtifactsManagerImplementation } from "../../../artifacts/artifacts-manager.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      hre.artifacts = new ArtifactsManagerImplementation();
    },
  };

  return handlers;
};
