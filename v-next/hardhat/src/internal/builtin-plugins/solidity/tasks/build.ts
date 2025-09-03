import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

import { throwIfSolidityBuildFailed } from "../build-results.js";
import { isNpmRootPath } from "../build-system/root-paths-utils.js";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { TargetSources } from "../../../../types/solidity.js";

interface BuildActionArguments {
  force: boolean;
  files: string[];
  quiet: boolean;
  defaultBuildProfile: string | undefined;
  targetSources: string;
}

const buildAction: NewTaskActionFunction<BuildActionArguments> = async (
  { force, files, quiet, defaultBuildProfile, targetSources },
  { solidity, globalOptions },
) => {
  validateTargetSources(targetSources);

  // If no specific files are passed, it means a full compilation, i.e. all source files
  const isFullCompilation = files.length === 0;

  const rootPaths = [];

  if (isFullCompilation) {
    rootPaths.push(...(await solidity.getRootFilePaths(targetSources)));
  } else {
    rootPaths.push(
      ...files.map((file) => {
        if (isNpmRootPath(file)) {
          return file;
        }

        return resolveFromRoot(process.cwd(), file);
      }),
    );
  }

  const buildProfile = globalOptions.buildProfile ?? defaultBuildProfile;

  const results = await solidity.build(rootPaths, {
    force,
    buildProfile,
    quiet,
    targetSources,
  });

  throwIfSolidityBuildFailed(results);

  // If we recompiled the entire project we cleanup the artifacts
  if (isFullCompilation) {
    await solidity.cleanupArtifacts(rootPaths, targetSources);
  }

  return { rootPaths };
};

function validateTargetSources(
  targetSources: string,
): asserts targetSources is TargetSources {
  if (!["contracts", "tests"].includes(targetSources)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: targetSources,
        type: "contracts | tests",
        name: "targetSources",
      },
    );
  }
}

export default buildAction;
