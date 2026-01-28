import type { SolidityHooks } from "hardhat/types/hooks";

import fs from "node:fs/promises";

import { FileBuildResultType } from "hardhat/types/solidity";

import {
  generateExposedContractsForCompilationJobsRoots as generateExposedContractsForRoots,
  getExposedPath,
} from "../../exposed-contracts.js";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    build: async (context, rootPaths, options, next) => {
      const exposedContractsPath = context.config.paths.exposedContracts;

      // Skip hook logic if we're building exposed contracts (prevents infinite loop)
      const isExposedBuild = rootPaths.every((p) =>
        p.startsWith(exposedContractsPath),
      );

      if (isExposedBuild) {
        return next(context, rootPaths, options);
      }

      // 1. Build the original contracts
      const results = await next(context, rootPaths, options);

      if ("reason" in results) {
        return results;
      }

      // Only generate exposed contracts for the "contracts" scope
      if (options?.scope !== "contracts") {
        return results;
      }

      // 2. Collect the files that need their exposed contracts regenerated
      //    - BUILD_SUCCESS (newly compiled)
      //    - CACHE_HIT with missing exposed file
      const rootFilesToRegenerate: Array<{
        rootPath: string;
        buildId: string;
      }> = [];

      for (const [rootPath, result] of results) {
        // Skip npm packages
        if (
          rootPath.startsWith("npm:") ||
          rootPath.startsWith(exposedContractsPath)
        ) {
          continue;
        }

        const exposedPath = getExposedPath(context, rootPath);

        if (result.type === FileBuildResultType.BUILD_SUCCESS) {
          rootFilesToRegenerate.push({
            rootPath,
            buildId: await result.compilationJob.getBuildId(),
          });
        } else if (result.type === FileBuildResultType.CACHE_HIT) {
          const exposedExists = await fileExists(exposedPath);
          if (!exposedExists) {
            rootFilesToRegenerate.push({ rootPath, buildId: result.buildId });
          }
        }
      }

      // 3. Generate exposed contracts for the files that need it
      if (rootFilesToRegenerate.length > 0) {
        await generateExposedContractsForRoots(context, rootFilesToRegenerate);
      }

      // 4. Collect ALL exposed contract paths for provided roots
      // Use rootPaths (the original input) because results might be empty on cache hit
      const allExposedPaths: string[] = [];
      for (const rootPath of rootPaths) {
        // Skip npm packages
        if (rootPath.startsWith("npm:")) {
          continue;
        }

        const exposedPath = getExposedPath(context, rootPath);
        allExposedPaths.push(exposedPath);
      }

      // 5. Build all exposed contracts
      const exposedResults = await context.solidity.build(
        allExposedPaths,
        options,
      );

      // Return errors instead of ignoring!
      if ("reason" in exposedResults) {
        return exposedResults;
      }

      // Merge ALL results
      for (const [filePath, result] of exposedResults) {
        results.set(filePath, result);
      }

      return results;
    },
  };

  return handlers;
};
