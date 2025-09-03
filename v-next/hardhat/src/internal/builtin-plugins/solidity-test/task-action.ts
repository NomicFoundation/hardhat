import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type {
  ObservabilityConfig,
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
} from "@nomicfoundation/edr";

import { finished } from "node:stream/promises";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import {
  markTestRunDone,
  markTestRunStart,
  markTestWorkerDone,
} from "../coverage/helpers.js";
import { throwIfSolidityBuildFailed } from "../solidity/build-results.js";

import { getEdrArtifacts, getBuildInfos } from "./edr-artifacts.js";
import {
  isTestSuiteArtifact,
  warnDeprecatedTestFail,
  solidityTestConfigToRunOptions,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
} from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";
import { ArtifactManagerImplementation } from "../artifacts/artifact-manager.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  grep?: string;
  noCompile: boolean;
  verbosity: number;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, verbosity },
  hre,
) => {
  if (!isSupportedChainType(chainType)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: chainType,
        type: "ChainType",
        name: "chainType",
      },
    );
  }

  // NOTE: We run the compile task first to ensure all the artifacts for them are generated
  // Then, we compile just the test sources. We don't do it in one go because the user
  // is likely to use different compilation options for the tests and the sources.
  if (noCompile === false) {
    await hre.tasks.getTask("compile").run();
  }

  // Run the compile task for test files
  const { rootPaths }: { rootPaths: string[] } = await hre.tasks
    .getTask("compile")
    .run({
      targetSources: "tests",
      quiet: true,
      force: false,
      files: testFiles,
    });

  const artifactsDirectory = await hre.solidity.getArtifactsDirectory("tests");

  const artifactsManager = new ArtifactManagerImplementation(
    artifactsDirectory,
  );

  const buildInfos = await getBuildInfos(artifactsManager);
  const edrArtifacts = await getEdrArtifacts(artifactsManager);

  const sourceNameToUserSourceName = new Map(
    edrArtifacts.map(({ userSourceName, edrAtifact }) => [
      edrAtifact.id.source,
      userSourceName,
    ]),
  );

  edrArtifacts.forEach(({ userSourceName, edrAtifact }) => {
    if (
      rootFilePaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ) &&
      isTestSuiteArtifact(edrAtifact)
    ) {
      warnDeprecatedTestFail(edrAtifact, sourceNameToUserSourceName);
    }
  });

  const testSuiteIds = edrArtifacts
    .filter(({ userSourceName }) =>
      rootPaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ),
    )
    .filter(({ edrAtifact }) => isTestSuiteArtifact(edrAtifact))
    .map(({ edrAtifact }) => edrAtifact.id);

  console.log("Running Solidity tests");
  console.log();

  let includesFailures = false;
  let includesErrors = false;

  const solidityTestConfig = hre.config.test.solidity;
  let observabilityConfig: ObservabilityConfig | undefined;
  if (hre.globalOptions.coverage) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );

    observabilityConfig = {
      codeCoverage: {
        onCollectedCoverageCallback: async (coverageData: Uint8Array[]) => {
          const tags = coverageData.map((tag) =>
            Buffer.from(tag).toString("hex"),
          );

          await hre._coverage.addData(tags);
        },
      },
    };
  }

  const config: SolidityTestRunnerConfigArgs =
    solidityTestConfigToSolidityTestRunnerConfigArgs(
      chainType,
      hre.config.paths.root,
      solidityTestConfig,
      verbosity,
      observabilityConfig,
      grep,
    );
  const tracingConfig: TracingConfigWithBuffers = {
    buildInfos,
    ignoreContracts: false,
  };
  const options: RunOptions =
    solidityTestConfigToRunOptions(solidityTestConfig);

  await markTestRunStart("solidity");

  const runStream = run(
    chainType,
    edrArtifacts.map(({ edrAtifact }) => edrAtifact),
    testSuiteIds,
    config,
    tracingConfig,
    sourceNameToUserSourceName,
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
    .compose((source) =>
      testReporter(source, sourceNameToUserSourceName, verbosity),
    );

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

  // NOTE: We collect coverage data for solidity tests in the main process.
  await markTestWorkerDone("solidity");
  // NOTE: This might print a coverage report.
  await markTestRunDone("solidity");

  if (includesFailures || includesErrors) {
    process.exitCode = 1;
  }

  console.log();
};

export default runSolidityTests;
