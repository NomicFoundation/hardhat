import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type {
  Artifact as EdrArtifact,
  BuildInfoAndOutput,
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

import { getFullyQualifiedName } from "../../../utils/contract-names.js";
import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import { ArtifactManagerImplementation } from "../artifacts/artifact-manager.js";
import {
  markTestRunStart as initCoverage,
  markTestWorkerDone as saveCoverageData,
  markTestRunDone as reportCoverage,
} from "../coverage/helpers.js";
import {
  markTestRunStart as initGasStats,
  markTestWorkerDone as saveGasStatsData,
  markTestRunDone as reportGasStats,
} from "../gas-analytics/helpers.js";
import { edrGasReportToHardhatGasMeasurements } from "../network-manager/edr/utils/convert-to-edr.js";

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
  assertHardhatInvariant(
    hre instanceof HardhatRuntimeEnvironmentImplementation,
    "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
  );

  // Set an environment variable that plugins can use to detect when a process is running tests
  process.env.HH_TEST = "true";

  // Sets the NODE_ENV environment variable to "test" so the code can detect that tests are running
  // This is done by other JS/TS test frameworks like vitest
  process.env.NODE_ENV ??= "test";

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

  // Run the build task for contract files if needed
  if (noCompile !== true) {
    await hre.tasks.getTask("build").run({
      noTests: true,
    });
  }

  // Run the build task for test files
  const { testRootPaths }: { testRootPaths: string[] } = await hre.tasks
    .getTask("build")
    .run({
      files: testFiles,
      noContracts: true,
    });
  console.log();

  // EDR needs all artifacts (contracts + tests)
  const edrArtifacts: Array<{
    edrAtifact: EdrArtifact;
    userSourceName: string;
  }> = [];
  const buildInfos: BuildInfoAndOutput[] = [];
  for (const scope of ["contracts", "tests"] as const) {
    const artifactsDir = await hre.solidity.getArtifactsDirectory(scope);
    const artifactManager = new ArtifactManagerImplementation(artifactsDir);
    edrArtifacts.push(...(await getEdrArtifacts(artifactManager)));
    buildInfos.push(...(await getBuildInfos(artifactManager)));
  }

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

  // Extract hardfork from the selected network configuration
  let hardfork: string | undefined;
  if (hre.globalOptions.network !== undefined) {
    const networkName = hre.globalOptions.network;
    const networkConfig = hre.config.networks[networkName];
    if (networkConfig !== undefined && networkConfig.type === "edr-simulated") {
      hardfork = networkConfig.hardfork;
    }
  }

  const config: SolidityTestRunnerConfigArgs =
    await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType,
      projectRoot: hre.config.paths.root,
      hardfork,
      config: solidityTestConfig,
      verbosity,
      observability: observabilityConfig,
      testPattern: grep,
      generateGasReport: hre.globalOptions.gasStats,
    });
  const tracingConfig: TracingConfigWithBuffers = {
    buildInfos,
    ignoreContracts: false,
  };
  const options: RunOptions =
    solidityTestConfigToRunOptions(solidityTestConfig);

  await initCoverage("solidity");
  await initGasStats("solidity");

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
      if (event.type === "suite:done") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      } else if (event.type === "run:done") {
        const { gasReport } = event.data;

        // Gas report may be undefined if gas analytics is disabled
        if (gasReport === undefined) {
          return;
        }

        const testContractFqns = testSuiteIds.map(({ name, source }) =>
          getFullyQualifiedName(source, name),
        );

        // we can't use the onGasMeasurement hook here as it's async and stream
        // handlers are sync
        const gasMeasurements = edrGasReportToHardhatGasMeasurements(
          gasReport,
          testContractFqns,
        );

        for (const measurement of gasMeasurements) {
          hre._gasAnalytics.addGasMeasurement(measurement);
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

  await saveCoverageData("solidity");
  await saveGasStatsData("solidity");

  // this may print coverage and gas statistics reports
  await reportCoverage("solidity");
  await reportGasStats("solidity");

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
