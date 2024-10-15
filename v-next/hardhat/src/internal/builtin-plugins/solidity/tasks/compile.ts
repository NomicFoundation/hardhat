import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

import { FileBuildResultType } from "../../../../types/solidity.js";
import { shouldMergeCompilationJobs } from "../build-profiles.js";
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
    force,
    buildProfile: globalOptions.buildProfile,
    mergeCompilationJobs: shouldMergeCompilationJobs(
      globalOptions.buildProfile,
    ),
    quiet,
  });

  if ("reason" in results) {
    throw new HardhatError(
      HardhatError.ERRORS.SOLIDITY.COMPILATION_JOB_CREATION_ERROR,
      {
        reason: results.formattedReason,
        rootFilePath: results.rootFilePath,
        buildProfile: results.buildProfile,
      },
    );
  }

  const sucessful = [...results.values()].every(
    ({ type }) =>
      type === FileBuildResultType.CACHE_HIT ||
      type === FileBuildResultType.BUILD_SUCCESS,
  );

  if (!sucessful) {
    throw new HardhatError(HardhatError.ERRORS.SOLIDITY.BUILD_FAILED);
  }

  // If we recompiled the entire project we cleanup the artifacts
  if (files.length === 0) {
    await solidity.cleanupArtifacts(rootPaths);
  }
};

export default compileAction;
