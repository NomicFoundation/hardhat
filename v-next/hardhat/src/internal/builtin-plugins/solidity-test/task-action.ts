import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
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
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import { ArtifactManagerImplementation } from "../artifacts/artifact-manager.js";
import {
  markTestRunDone,
  markTestRunStart,
  markTestWorkerDone,
} from "../coverage/helpers.js";

import { getEdrArtifacts, getBuildInfos } from "./edr-artifacts.js";
import {
  isTestSuiteArtifact,
  warnDeprecatedTestFail,
  solidityTestConfigToRunOptions,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
} from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  grep?: string;
  noCompile: boolean;
  verbosity: number;
  testSummaryIndex: number;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, verbosity, testSummaryIndex },
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

  // Run the compile task for test files

  const { testRootPaths }: { testRootPaths: string[] } = await hre.tasks
    .getTask("compile")
    .run({
      quiet: true,
      force: false,
      files: testFiles,
      noContracts: noCompile,
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
      testRootPaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ) &&
      isTestSuiteArtifact(edrAtifact)
    ) {
      warnDeprecatedTestFail(edrAtifact, sourceNameToUserSourceName);
    }
  });

  const testSuiteIds = edrArtifacts
    .filter(({ userSourceName }) =>
      testRootPaths.includes(
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
    await solidityTestConfigToSolidityTestRunnerConfigArgs(
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

  let failed = 0;
  let passed = 0;
  let skipped = 0;
  let failureOutput = "";

  const testReporterStream = runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      }
    })
    .compose(async function* (source) {
      const reporter = testReporter(
        source,
        sourceNameToUserSourceName,
        verbosity,
        testSummaryIndex,
      );

      for await (const value of reporter) {
        if (typeof value === "string") {
          yield value;
        } else {
          failed = value.failed;
          passed = value.passed;
          skipped = value.skipped;
          failureOutput = value.failureOutput;
        }
      }
    });

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

  return {
    failed,
    passed,
    skipped,
    todo: 0,
    failureOutput,
  };
};

export default runSolidityTests;
