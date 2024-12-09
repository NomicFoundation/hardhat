import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { finished } from "node:stream/promises";

import {
  getAllFilesMatching,
  isDirectory,
} from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import { createNonClosingWriter } from "@ignored/hardhat-vnext-utils/stream";

import { shouldMergeCompilationJobs } from "../solidity/build-profiles.js";

import {
  getArtifacts,
  getTestSuiteIds,
  throwIfSolidityBuildFailed,
} from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  timeout: number;
  noCompile: boolean;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { timeout, noCompile },
  hre,
) => {
  const rootFilePaths = (
    await Promise.all(
      hre.config.paths.tests.solidity
        .map((p) => resolveFromRoot(hre.config.paths.root, p))
        .map(async (p) => {
          // NOTE: The paths specified in the `paths.tests.solidity` array
          // can be either directories or files.
          if (await isDirectory(p)) {
            return getAllFilesMatching(p, (f) => f.endsWith(".sol"));
          } else if (p.endsWith(".sol") === true) {
            return [p];
          } else {
            return [];
          }
        }),
    )
  ).flat(1);

  const buildOptions: BuildOptions = {
    // NOTE: The uncached sources will still be compiled event if `noCompile`
    // is true. We could consider adding a `cacheOnly` option to support true
    // `noCompile` behavior.
    force: !noCompile,
    buildProfile: hre.globalOptions.buildProfile,
    mergeCompilationJobs: shouldMergeCompilationJobs(
      hre.globalOptions.buildProfile,
    ),
    quiet: false,
  };

  const results = await hre.solidity.build(rootFilePaths, buildOptions);

  throwIfSolidityBuildFailed(results);

  const artifacts = await getArtifacts(results, hre.config.paths.artifacts);
  const testSuiteIds = await getTestSuiteIds(
    artifacts,
    rootFilePaths,
    hre.config.paths.root,
  );

  console.log("Running Solidity tests");
  console.log();

  const config = {
    projectRoot: hre.config.paths.root,
  };

  let includesFailures = false;
  let includesErrors = false;

  const options: RunOptions = { timeout };

  const runStream = run(artifacts, testSuiteIds, config, options);

  const testReporterStream = runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      }
    })
    .compose(testReporter);

  const outputStream = testReporterStream.pipe(
    createNonClosingWriter(process.stdout),
  );

  try {
    // NOTE: We're awaiting the original run stream to finish to catch any
    // errors produced by the runner.
    await finished(runStream);

    // We also await the output stream to finish, as we want to wait for it
    // to avoid returning before the whole output was generated.
    await finished(outputStream);
  } catch (error) {
    console.error(error);
    includesErrors = true;
  }

  if (includesFailures || includesErrors) {
    process.exitCode = 1;
  }

  console.log();
};

export default runSolidityTests;
