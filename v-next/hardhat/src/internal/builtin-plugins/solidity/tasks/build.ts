import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { BuildScope } from "../../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

import { throwIfSolidityBuildFailed } from "../build-results.js";
import { isNpmRootPath } from "../build-system/root-paths-utils.js";

interface BuildActionArguments {
  force: boolean;
  files: string[];
  quiet: boolean;
  defaultBuildProfile: string | undefined;
  noTests: boolean;
  noContracts: boolean;
}

const buildAction: NewTaskActionFunction<BuildActionArguments> = async (
  args: BuildActionArguments,
  hre,
) => {
  const contractRootPaths = [];
  const testRootPaths = [];

  if (args.noContracts === false) {
    contractRootPaths.push(...(await buildForScope("contracts", args, hre)));
  }

  if (args.noTests === false) {
    testRootPaths.push(...(await buildForScope("tests", args, hre)));
  }

  return { contractRootPaths, testRootPaths };
};

async function buildForScope(
  scope: BuildScope,
  { force, files, quiet, defaultBuildProfile }: BuildActionArguments,
  { solidity, globalOptions }: HardhatRuntimeEnvironment,
) {
  // If no specific files are passed, it means a full compilation, i.e. all source files
  const isFullCompilation = files.length === 0;

  const rootPaths = [];

  if (isFullCompilation) {
    rootPaths.push(...(await solidity.getRootFilePaths({ scope })));
  } else {
    for (const file of files) {
      if (isNpmRootPath(file)) {
        rootPaths.push(file);
      }

      const rootPath = resolveFromRoot(process.cwd(), file);

      if ((await solidity.getScope(rootPath)) !== scope) {
        continue;
      }

      rootPaths.push(rootPath);
    }

    // If a file list has been passed but none match this scope, we don't run the build
    if (rootPaths.length === 0) {
      return [];
    }
  }

  const buildProfile = globalOptions.buildProfile ?? defaultBuildProfile;

  const results = await solidity.build(rootPaths, {
    force,
    buildProfile,
    quiet,
    scope,
  });

  throwIfSolidityBuildFailed(results);

  // If we recompiled the entire project we cleanup the artifacts
  if (isFullCompilation) {
    await solidity.cleanupArtifacts(rootPaths, { scope });
  }

  return rootPaths;
}

export default buildAction;
