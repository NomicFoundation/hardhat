import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type { TestRunResult } from "../../../types/test.js";
import type { Result } from "../../../types/utils.js";
import type {
  Artifact as EdrArtifact,
  BuildInfoAndOutput,
  ObservabilityConfig,
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
  SuiteResult,
} from "@nomicfoundation/edr";

import { finished } from "node:stream/promises";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";

import { getFullyQualifiedName } from "../../../utils/contract-names.js";
import { errorResult, successfulResult } from "../../../utils/result.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import { ArtifactManagerImplementation } from "../artifacts/artifact-manager.js";
import { getCoverageManager } from "../coverage/helpers.js";
import { getGasAnalyticsManager } from "../gas-analytics/helpers.js";
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

export interface SolidityTestRunResult extends TestRunResult {
  suiteResults: SuiteResult[];
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, verbosity, testSummaryIndex },
  hre,
): Promise<Result<SolidityTestRunResult, SolidityTestRunResult>> => {
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
    edrArtifact: EdrArtifact;
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
    edrArtifacts.map(({ userSourceName, edrArtifact }) => [
      edrArtifact.id.source,
      userSourceName,
    ]),
  );

  edrArtifacts.forEach(({ userSourceName, edrArtifact }) => {
    if (
      testRootPaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ) &&
      isTestSuiteArtifact(edrArtifact)
    ) {
      warnDeprecatedTestFail(edrArtifact, sourceNameToUserSourceName);
    }
  });

  const testSuiteIds = edrArtifacts
    .filter(({ userSourceName }) =>
      testRootPaths.includes(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ),
    )
    .filter(({ edrArtifact }) => isTestSuiteArtifact(edrArtifact))
    .map(({ edrArtifact }) => edrArtifact.id);

  console.log("Running Solidity tests");
  console.log();

  let includesFailures = false;
  let includesErrors = false;

  const solidityTestConfig = hre.config.test.solidity;
  let observabilityConfig: ObservabilityConfig | undefined;
  if (hre.globalOptions.coverage) {
    const coverage = getCoverageManager(hre);
    observabilityConfig = {
      codeCoverage: {
        onCollectedCoverageCallback: async (coverageData: Uint8Array[]) => {
          const tags = coverageData.map((tag) =>
            Buffer.from(tag).toString("hex"),
          );

          await coverage.addData(tags);
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

  const testRunnerConfig: SolidityTestRunnerConfigArgs =
    await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType,
      projectRoot: hre.config.paths.root,
      hardfork,
      config: solidityTestConfig,
      verbosity,
      observability: observabilityConfig,
      testPattern: grep,
      generateGasReport:
        hre.globalOptions.gasStats ||
        hre.globalOptions.gasStatsJson !== undefined,
    });
  const tracingConfig: TracingConfigWithBuffers = {
    buildInfos,
    ignoreContracts: false,
  };
  const options: RunOptions =
    solidityTestConfigToRunOptions(solidityTestConfig);

  await hre.hooks.runHandlerChain(
    "test",
    "onTestRunStart",
    ["solidity"],
    async () => {},
  );

  const runStream = run(
    chainType,
    edrArtifacts.map(({ edrArtifact }) => edrArtifact),
    testSuiteIds,
    testRunnerConfig,
    tracingConfig,
    sourceNameToUserSourceName,
    options,
  );

  let failed = 0;
  let passed = 0;
  let skipped = 0;
  let failureOutput = "";
  const suiteResults: SuiteResult[] = [];
  const testReporterStream = runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:done") {
        suiteResults.push(event.data);
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

        const gasAnalytics = getGasAnalyticsManager(hre);
        for (const measurement of gasMeasurements) {
          gasAnalytics.addGasMeasurement(measurement);
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

  await hre.hooks.runHandlerChain(
    "test",
    "onTestWorkerDone",
    ["solidity"],
    async () => {},
  );

  await hre.hooks.runHandlerChain(
    "test",
    "onTestRunDone",
    ["solidity"],
    async () => {},
  );

  console.log();

  const result = {
    summary: { failed, passed, skipped, todo: 0, failureOutput },
    suiteResults,
  };

  return includesFailures || includesErrors
    ? errorResult(result)
    : successfulResult(result);
};

export default runSolidityTests;
