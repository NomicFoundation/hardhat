import type { HookContext, SolidityHooks } from "hardhat/types/hooks";

import { generateTypes } from "../generate-types.js";

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    async onCleanUpArtifacts(
      context: HookContext,
      artifactPaths: string[],
      next: (
        nextContext: HookContext,
        artifactPaths: string[],
      ) => Promise<void>,
    ) {
      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        artifactPaths,
      );

      return next(context, artifactPaths);
    },
  };

  return handlers;
};
