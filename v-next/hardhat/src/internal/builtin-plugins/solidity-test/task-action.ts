import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type {
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
} from "@ignored/edr";

import { finished } from "node:stream/promises";

import { getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import { createNonClosingWriter } from "@ignored/hardhat-vnext-utils/stream";

import { shouldMergeCompilationJobs } from "../solidity/build-profiles.js";
import {
  getArtifactsAndBuildInfos,
  throwIfSolidityBuildFailed,
} from "../solidity/build-results.js";

import {
  solidityTestConfigToRunOptions,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
} from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  testFiles: string[];
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles },
  hre,
) => {
  let rootFilePaths: string[];

  if (testFiles.length > 0) {
    rootFilePaths = testFiles.map((f) =>
      resolveFromRoot(hre.config.paths.root, f),
    );
  } else {
    // NOTE: A test file is either a file with a `.sol` extension in the `tests.solidity`
    // directory or a file with a `.t.sol` extension in the `sources.solidity` directory
    rootFilePaths = (
      await Promise.all([
        getAllFilesMatching(hre.config.paths.tests.solidity, (f) =>
          f.endsWith(".sol"),
        ),
        ...hre.config.paths.sources.solidity.map(async (dir) => {
          return getAllFilesMatching(dir, (f) => f.endsWith(".t.sol"));
        }),
      ])
    ).flat(1);
  }

  const buildOptions: BuildOptions = {
    force: false,
    buildProfile: hre.globalOptions.buildProfile,
    mergeCompilationJobs: shouldMergeCompilationJobs(
      hre.globalOptions.buildProfile,
    ),
    quiet: true,
  };

  const results = await hre.solidity.build(rootFilePaths, buildOptions);

  throwIfSolidityBuildFailed(results);

  const { artifacts, buildInfos } = await getArtifactsAndBuildInfos(
    results,
    hre.artifacts,
  );
  const testSuiteIds = artifacts.map((artifact) => artifact.id);

  console.log("Running Solidity tests");
  console.log();

  let includesFailures = false;
  let includesErrors = false;

  const solidityTestConfig = hre.config.solidityTest;

  const config: SolidityTestRunnerConfigArgs =
    solidityTestConfigToSolidityTestRunnerConfigArgs(
      hre.config.paths.root,
      solidityTestConfig,
    );
  const tracingConfig: TracingConfigWithBuffers = {
    buildInfos,
    ignoreContracts: false,
  };
  const options: RunOptions =
    solidityTestConfigToRunOptions(solidityTestConfig);

  const runStream = run(
    artifacts,
    testSuiteIds,
    config,
    tracingConfig,
    options,
  );

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
