import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { BuildOptions } from "../../../types/solidity/build-system.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type {
  ObservabilityConfig,
  SolidityTestRunnerConfigArgs,
  SuiteResult,
  TracingConfigWithBuffers,
} from "@nomicfoundation/edr";

import path from "node:path";
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
import { reportGasUsage } from "./gas-reporter.js";
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
  grep?: string;
  noCompile: boolean;
  verbosity: number;
  gasReport: boolean;
  gasReportSnapshot: boolean;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  {
    testFiles,
    chainType,
    grep,
    noCompile,
    verbosity,
    gasReport,
    gasReportSnapshot,
  },
  hre,
) => {
  let rootFilePaths: string[];

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
  const edrArtifacts = await getEdrArtifacts(hre.artifacts);

  const testSuiteIds = edrArtifacts
    .filter(({ userSourceName }) =>
      rootFilePaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ),
    )
    .filter(({ edrAtifact }) => isTestSuiteArtifact(edrAtifact))
    .map(({ edrAtifact }) => edrAtifact.id);

  console.log("Running Solidity tests");
  console.log();

  const solidityTestConfig = hre.config.solidityTest;
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

  const sourceNameToUserSourceName = new Map(
    edrArtifacts.map(({ userSourceName, edrAtifact }) => [
      edrAtifact.id.source,
      userSourceName,
    ]),
  );

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

  const suiteResults: SuiteResult[] = [];
  const testReporterStream = runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        suiteResults.push(event.data);
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
    process.exitCode = 1;
  }

  // NOTE: We collect coverage data for solidity tests in the main process.
  await markTestWorkerDone("solidity");
  // NOTE: This might print a coverage report.
  await markTestRunDone("solidity");

  if (gasReport) {
    // TODO: Change the gas report directory once we settle on the format
    const gasReportPath = path.join(hre.config.paths.cache, "gas");
    // NOTE: This will print a gas report.
    await reportGasUsage(gasReportPath, suiteResults, gasReportSnapshot);
  }

  const testResults = suiteResults.flatMap(
    (suiteResult) => suiteResult.testResults,
  );
  const testRunFailed = testResults.some(
    (testResult) => testResult.status === "Failure",
  );
  if (testRunFailed) {
    process.exitCode = 1;
  }

  console.log();
};

export default runSolidityTests;
