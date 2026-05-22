import type { HookContext, SolidityHooks } from "hardhat/types/hooks";
import type { ResolvedBuildOptions } from "hardhat/types/solidity";

import { generateTypes } from "../generate-types.js";

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    async processArtifactsAfterSuccessfulBuild(
      context: HookContext,
      artifactPaths: readonly string[],
      _buildRootFilePaths: readonly string[],
      _buildOptions: Readonly<ResolvedBuildOptions>,
    ) {
      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        [...artifactPaths],
      );
    },
  };

  return handlers;
};
