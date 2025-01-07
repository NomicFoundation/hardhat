import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { finished } from "node:stream/promises";

import { getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";
import { createNonClosingWriter } from "@ignored/hardhat-vnext-utils/stream";

import { shouldMergeCompilationJobs } from "../solidity/build-profiles.js";
import {
  getArtifacts,
  throwIfSolidityBuildFailed,
} from "../solidity/build-results.js";

import { getTestSuiteIds } from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  timeout: number;
  force: boolean;
  quiet: boolean;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { timeout, force, quiet },
  hre,
) => {
  const rootSourceFilePaths = await hre.solidity.getRootFilePaths();
  // NOTE: A test file is either a file with a `.sol` extension in the `tests.solidity`
  // directory or a file with a `.t.sol` extension in the `sources.solidity` directory
  const rootTestFilePaths = (
    await Promise.all([
      getAllFilesMatching(hre.config.paths.tests.solidity, (f) =>
        f.endsWith(".sol"),
      ),
      ...hre.config.paths.sources.solidity.map(async (dir) => {
        return getAllFilesMatching(dir, (f) => f.endsWith(".t.sol"));
      }),
    ])
  ).flat(1);

  const buildOptions: BuildOptions = {
    force,
    buildProfile: hre.globalOptions.buildProfile,
    mergeCompilationJobs: shouldMergeCompilationJobs(
      hre.globalOptions.buildProfile,
    ),
    quiet,
  };

  // NOTE: We compile all the sources together with the tests
  const rootFilePaths = [...rootSourceFilePaths, ...rootTestFilePaths];
  const results = await hre.solidity.build(rootFilePaths, buildOptions);

  throwIfSolidityBuildFailed(results);

  const artifacts = await getArtifacts(results, hre.config.paths.artifacts);
  const testSuiteIds = await getTestSuiteIds(
    artifacts,
    rootTestFilePaths,
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
