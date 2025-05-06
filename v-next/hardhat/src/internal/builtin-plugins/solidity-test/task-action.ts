import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type {
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
} from "@ignored/edr";

import { finished } from "node:stream/promises";

import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";
import chalk from "chalk";

import {
  getArtifacts,
  getBuildInfos,
  throwIfSolidityBuildFailed,
} from "../solidity/build-results.js";

import {
  isTestSuiteArtifact,
  solidityTestConfigToRunOptions,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
} from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  noCompile: boolean;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, noCompile },
  hre,
) => {
  let rootFilePaths: string[];

  if (chainType !== "l1") {
    console.log(
      chalk.yellow(
        `Chain type selection for tests will be implemented soon. Please check our communication channels for updates. For now, please run the task without the --chain-type option.`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  // NOTE: We run the compile task first to ensure all the artifacts for them are generated
  // Then, we compile just the test sources. We don't do it in one go because the user
  // is likely to use different compilation options for the tests and the sources.
  if (noCompile === false) {
    await hre.tasks.getTask("compile").run();
  }

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
  // NOTE: We remove duplicates in case there is an intersection between
  // the tests.solidity paths and the sources paths
  rootFilePaths = Array.from(new Set(rootFilePaths));

  // NOTE: We are not skipping the test compilation even if the noCompile flag is set
  // because the user cannot run test compilation outside of the test task yet.
  // TODO: Allow users to run test compilation outside of the test task.
  const buildOptions: BuildOptions = {
    force: false,
    buildProfile: hre.globalOptions.buildProfile ?? "default",
    quiet: true,
  };
  const results = await hre.solidity.build(rootFilePaths, buildOptions);
  throwIfSolidityBuildFailed(results);

  const buildInfos = await getBuildInfos(hre.artifacts);
  const artifacts = await getArtifacts(hre.artifacts);
  const testSuiteIds = artifacts
    .filter((artifact) =>
      rootFilePaths.includes(
        resolveFromRoot(hre.config.paths.root, artifact.id.source),
      ),
    )
    .filter(isTestSuiteArtifact)
    .map((artifact) => artifact.id);

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
