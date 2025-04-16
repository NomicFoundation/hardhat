import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

import { throwIfSolidityBuildFailed } from "../build-results.js";
import { isNpmRootPath } from "../build-system/root-paths-utils.js";

interface CompileActionArguments {
  force: boolean;
  files: string[];
  quiet: boolean;
}

const compileAction: NewTaskActionFunction<CompileActionArguments> = async (
  { force, files, quiet },
  { solidity, globalOptions },
) => {
  const rootPaths =
    files.length === 0
      ? await solidity.getRootFilePaths()
      : files.map((file) => {
          if (isNpmRootPath(file)) {
            return file;
          }

          return resolveFromRoot(process.cwd(), file);
        });

  const results = await solidity.build(rootPaths, {
    buildProfile: globalOptions.buildProfile,
    coverage: globalOptions.coverage,
    force,
    quiet,
  });

  throwIfSolidityBuildFailed(results);

  // If we recompiled the entire project we cleanup the artifacts
  if (files.length === 0) {
    await solidity.cleanupArtifacts(rootPaths);
  }
};

export default compileAction;
