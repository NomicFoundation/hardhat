import type { HookContext, SolidityHooks } from "hardhat/types/hooks";
import type {
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
} from "hardhat/types/solidity";

import path from "node:path";

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
      if (!context.solidity.isSuccessfulBuildResult(result)) {
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

      let artifactPaths = Array.from(allArtifactPaths);

      // When splitTestsCompilation is disabled, contract and test artifacts
      // live in the same directory. Filter out test artifacts so TypeChain
      // only generates types for contracts.
      if (!context.config.solidity.splitTestsCompilation) {
        const artifactsRoot = context.config.paths.artifacts;
        const projectRoot = context.config.paths.root;

        const filtered: string[] = [];
        for (const artifactPath of artifactPaths) {
          // Derive the source file path from the artifact path.
          // TODO: Reconstructing the path shouldn't be necessary
          const relativeFromArtifacts = path.relative(
            artifactsRoot,
            artifactPath,
          );

          const parts = relativeFromArtifacts.split(path.sep);
          const sourceRelative = parts.slice(0, -1).join(path.sep);
          const sourcePath = path.resolve(projectRoot, sourceRelative);

          const scope = await context.solidity.getScope(sourcePath);
          if (scope === "contracts") {
            filtered.push(artifactPath);
          }
        }

        artifactPaths = filtered;
      }

      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        artifactPaths,
      );

      return result;
    },
  };

  return handlers;
};
