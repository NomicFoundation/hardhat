import type { SuccessfulFileBuildResult } from "../../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../../types/tasks.js";
import type { PublicConfig as RunTypeChainConfig } from "typechain";

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

  // ----
  // solidity compilation here
  // const compileSolOutput = await runSuper(taskArgs)
  // await run(TASK_TYPECHAIN_GENERATE_TYPES, { compileSolOutput, quiet: taskArgs.quiet })
  // ----
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

  // ---------------------------------------------------------
  // ---------------------------------------------------------

  const artifactsPaths = extractArtifactsPaths(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TMP
    results as Map<string, SuccessfulFileBuildResult>,
  );

  // console.log(artifactsPaths);

  console.log("=========================================== BEFORE");

  const { runTypeChain } = await import("typechain");

  const cwd = process.cwd();

  // console.log(cwd);

  console.log(artifactsPaths);

  const typechainOptions: Omit<RunTypeChainConfig, "filesToProcess"> = {
    cwd,
    allFiles: artifactsPaths,
    // outDir: `${cwd}/typechain/types`,
    target: "ethers-v6",
    flags: {
      alwaysGenerateOverloads: false,
      discriminateTypes: false, // typechainCfg.discriminateTypes,

      tsNocheck: false, // typechainCfg.tsNocheck,
      environment: "hardhat",
      node16Modules: true, // typechainCfg.node16Modules,
    },
  };

  const result = await runTypeChain({
    ...typechainOptions,
    filesToProcess: artifactsPaths,
  });

  console.log(`Successfully generated ${result.filesGenerated} typings!`);

  console.log("=========================================== AFTER");

  // ---------------------------------------------------------
  // ---------------------------------------------------------
};

function extractArtifactsPaths(
  results: Map<string, SuccessfulFileBuildResult>,
): string[] {
  const artifactSet = new Set<string>();

  results.forEach((r) => {
    r.contractArtifactsGenerated.forEach((artifactPath) =>
      artifactSet.add(artifactPath),
    );
  });

  return Array.from(artifactSet);
}

// function getFQNamesFromCompilationOutput(compileSolOutput: any): string[] {
//   const allFQNNamesNested = compileSolOutput.artifactsEmittedPerJob.map(
//     (a: any) => {
//       return a.artifactsEmittedPerFile.map((artifactPerFile: any) => {
//         return artifactPerFile.artifactsEmitted.map((artifactName: any) => {
//           return getFullyQualifiedName(
//             artifactPerFile.file.sourceName,
//             artifactName,
//           );
//         });
//       });
//     },
//   );

//   return allFQNNamesNested.flat(2);
// }

// function getFullyQualifiedName(
//   sourceName: string,
//   contractName: string,
// ): string {
//   return `${sourceName}:${contractName}`;
// }

export default compileAction;
