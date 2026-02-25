import type { HookContext, SolidityHooks } from "hardhat/types/hooks";
import type {
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
} from "hardhat/types/solidity";

import { generateTypes } from "../generate-types.js";

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    async build(
      context: HookContext,
      rootFilePaths: string[],
      options: BuildOptions | undefined,
      next: (
        nextContext: HookContext,
        nextRootFilePaths: string[],
        nextOptions: BuildOptions | undefined,
      ) => Promise<CompilationJobCreationError | Map<string, FileBuildResult>>,
    ) {
      const result = await next(context, rootFilePaths, options);

      // Skip if build failed (returned an error)
      if ("reason" in result) {
        return result;
      }

      // Skip for test scope (contracts only)
      if (options?.scope === "tests") {
        return result;
      }

      // Clear cache to ensure fresh data after compilation
      await context.artifacts.clearCache();

      // Get all artifact paths and generate types
      const allArtifactPaths = await context.artifacts.getAllArtifactPaths();

      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        Array.from(allArtifactPaths),
      );

      return result;
    },
  };

  return handlers;
};
