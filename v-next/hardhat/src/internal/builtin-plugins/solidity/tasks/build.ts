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
  scope: string;
}

const buildAction: NewTaskActionFunction<BuildActionArguments> = async (
  { force, files, quiet, defaultBuildProfile, scope },
  { solidity, globalOptions },
) => {
  validateScope(scope);

  // If no specific files are passed, it means a full compilation, i.e. all source files
  const isFullCompilation = files.length === 0;

  const rootPaths = [];

  if (isFullCompilation) {
    rootPaths.push(...(await solidity.getRootFilePaths(scope)));
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
    scope,
  });

  throwIfSolidityBuildFailed(results);

  // If we recompiled the entire project we cleanup the artifacts
  if (isFullCompilation) {
    await solidity.cleanupArtifacts(rootPaths, scope);
  }

  return { rootPaths };
};

function validateScope(scope: string): asserts scope is BuildScope {
  if (!["contracts", "tests"].includes(scope)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: scope,
        type: "contracts | tests",
        name: "scope",
      },
    );
  }
}

export default buildAction;
