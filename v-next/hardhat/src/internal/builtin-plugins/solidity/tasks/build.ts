import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { BuildScope } from "../../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
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
  let contractRootPaths: string[] = [];
  let testRootPaths: string[] = [];
  const allUsedFiles: string[] = [];

  if (args.noContracts === false) {
    const { rootPaths, usedFiles } = await buildForScope(
      "contracts",
      args,
      hre,
    );

    contractRootPaths = rootPaths;
    allUsedFiles.push(...usedFiles);
  }

  if (args.noTests === false) {
    const { rootPaths, usedFiles } = await buildForScope("tests", args, hre);

    testRootPaths = rootPaths;
    allUsedFiles.push(...usedFiles);
  }

  // If there's an unused file we fail
  if (args.files.length !== 0) {
    const files = new Set(args.files);
    const usedFiles = new Set(allUsedFiles);
    const unusedFiles = files.difference(usedFiles);

    if (unusedFiles.size > 0) {
      const list = [...unusedFiles]
        .sort()
        .map((f) => `- ${f}`)
        .join("\n");

      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.UNRECOGNIZED_FILES_NOT_COMPILED,
        { files: list },
      );
    }
  }

  await hre.hooks.runHandlerChain(
    "solidity",
    "onBuildCompleted",
    [],
    async () => {},
  );

  return { contractRootPaths, testRootPaths };
};

async function buildForScope(
  scope: BuildScope,
  { force, files, quiet, defaultBuildProfile }: BuildActionArguments,
  { solidity, globalOptions }: HardhatRuntimeEnvironment,
) {
  const usedFiles = [];

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

      usedFiles.push(file);
      rootPaths.push(rootPath);
    }

    // If a file list has been passed but none match this scope, we don't run the build
    if (rootPaths.length === 0) {
      return { rootPaths, usedFiles };
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

  return { rootPaths, usedFiles };
}

export default buildAction;
