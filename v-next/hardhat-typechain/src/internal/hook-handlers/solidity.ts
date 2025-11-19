import type { HookContext, SolidityHooks } from "hardhat/types/hooks";

import { generateTypes } from "../generate-types.js";

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    async onBuildCompleted(
      context: HookContext,
      next: (nextContext: HookContext) => Promise<void>,
    ) {
      const artifactPaths = Array.from(
        await context.artifacts.getAllArtifactPaths(),
      );

      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        artifactPaths,
      );

      return next(context);
    },
  };

  return handlers;
};
