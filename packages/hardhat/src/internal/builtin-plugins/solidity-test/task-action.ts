import type {
  BuildInfoAndOutput,
  EdrArtifactWithMetadata,
} from "./edr-artifacts.js";
import type { TestEvent } from "./types.js";
import type {
  BuildScope,
  SolidityBuildSystem,
} from "../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type { TestRunResult } from "../../../types/test.js";
import type { Result } from "../../../types/utils.js";
import type {
  ObservabilityConfig,
  TracingConfigWithBuffers,
  SuiteResult,
} from "@nomicfoundation/edr";

import { finished } from "node:stream/promises";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";

import { getFullyQualifiedName } from "../../../utils/contract-names.js";
import { errorResult, successfulResult } from "../../../utils/result.js";
import { isSupportedChainType } from "../../edr/chain-type.js";
import { ArtifactManagerImplementation } from "../artifacts/artifact-manager.js";
import { getCoverageManager } from "../coverage/helpers.js";
import { getGasAnalyticsManager } from "../gas-analytics/helpers/accessors.js";
import { edrGasReportToHardhatGasMeasurements } from "../network-manager/edr/utils/convert-to-edr.js";

import {
  buildEdrArtifactsWithMetadata,
  getBuildInfosAndOutputs,
} from "./edr-artifacts.js";
import {
  isTestSuiteArtifact,
  warnDeprecatedTestFail,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
} from "./helpers.js";
import { getTestFunctionOverrides } from "./inline-config/index.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  testFiles: string[];
  chainType: string;
  grep?: string;
  noCompile: boolean;
  testSummaryIndex: number;
}

export interface SolidityTestRunResult extends TestRunResult {
  suiteResults: SuiteResult[];
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, chainType, grep, noCompile, testSummaryIndex },
  hre,
): Promise<Result<SolidityTestRunResult, SolidityTestRunResult>> => {
  // Set an environment variable that plugins can use to detect when a process is running tests
  process.env.HH_TEST = "true";

  const verbosity = hre.globalOptions.verbosity;

  // NOTE: The resolution from CWD mimics what `build` does. It's important for
  // both tasks to be aligned.
  const resolvedTestFilesArgument = testFiles.map((f) =>
    resolveFromRoot(process.cwd(), f),
  );

  await validateThatProvidedFilesAreTests(
    hre.solidity,
    testFiles,
    resolvedTestFilesArgument,
  );

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

  let testRootPathsToRun: string[];
  let edrArtifactsWithMetadata: EdrArtifactWithMetadata[];
  let allBuildInfosAndOutputs: BuildInfoAndOutput[];

  if (hre.config.solidity.splitTestsCompilation) {
    if (noCompile !== true) {
      await hre.tasks.getTask("build").run({
        noTests: true,
      });
    }

    ({ testRootPaths: testRootPathsToRun } = await hre.tasks
      .getTask("build")
      .run({
        files: testFiles,
        noContracts: true,
      }));
    console.log();

    ({ edrArtifactsWithMetadata, allBuildInfosAndOutputs } =
      await loadArtifacts(hre.solidity, ["contracts", "tests"]));
  } else {
    if (noCompile !== true) {
      ({ testRootPaths: testRootPathsToRun } = await hre.tasks
        .getTask("build")
        .run({
          files: testFiles,
        }));
    } else {
      if (resolvedTestFilesArgument.length > 0) {
        testRootPathsToRun = resolvedTestFilesArgument;
      } else {
        testRootPathsToRun = [];
        const allRoots = await hre.solidity.getRootFilePaths({
          scope: "contracts",
        });

        for (const root of allRoots) {
          if ((await hre.solidity.getScope(root)) === "tests") {
            testRootPathsToRun.push(root);
          }
        }
      }
    }
    console.log();

    ({ edrArtifactsWithMetadata, allBuildInfosAndOutputs } =
      await loadArtifacts(hre.solidity, ["contracts"]));

    // When noCompile, validate selected test roots have compiled artifacts
    if (noCompile === true) {
      const compiledSources = new Set(
        edrArtifactsWithMetadata.map(({ userSourceName }) =>
          resolveFromRoot(hre.config.paths.root, userSourceName),
        ),
      );

      const notCompiledFiles: string[] = [];
      for (const root of testRootPathsToRun) {
        if (!compiledSources.has(root)) {
          notCompiledFiles.push(root);
        }
      }

      if (notCompiledFiles.length > 0) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SELECTED_TEST_FILES_NOT_COMPILED,
          {
            files: notCompiledFiles.map((f) => `- ${f}`).join("\n"),
          },
        );
      }
    }
  }

  const sourceNameToUserSourceName = new Map(
    edrArtifactsWithMetadata.map(({ userSourceName, edrArtifact }) => [
      edrArtifact.id.source,
      userSourceName,
    ]),
  );

  const testRootPathsSet = new Set(testRootPathsToRun);
  const testSuiteArtifacts = edrArtifactsWithMetadata
    .filter(({ userSourceName }) =>
      testRootPathsSet.has(
        resolveFromRoot(hre.config.paths.root, userSourceName),
      ),
    )
    .filter(({ edrArtifact }) => isTestSuiteArtifact(edrArtifact));

  for (const { edrArtifact } of testSuiteArtifacts) {
    warnDeprecatedTestFail(edrArtifact, sourceNameToUserSourceName);
  }

  const testSuiteIds = testSuiteArtifacts.map(
    ({ edrArtifact }) => edrArtifact.id,
  );

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

  const testFunctionOverrides = getTestFunctionOverrides(
    testSuiteArtifacts,
    allBuildInfosAndOutputs,
  );

  const testRunnerConfig =
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
      testFunctionOverrides,
    });
  const tracingConfig: TracingConfigWithBuffers = {
    buildInfos: allBuildInfosAndOutputs.map(({ buildInfo, output }) => ({
      buildInfo,
      output,
    })),
    ignoreContracts: false,
  };
  await hre.hooks.runHandlerChain(
    "test",
    "onTestRunStart",
    ["solidity"],
    async () => {},
  );

  const runStream = run(
    chainType,
    edrArtifactsWithMetadata.map(({ edrArtifact }) => edrArtifact),
    testSuiteIds,
    testRunnerConfig,
    tracingConfig,
    sourceNameToUserSourceName,
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

/**
 * Validates that the test files provided by the user, resolved in this case,
 * are actually test files.
 *
 * @param solidity The solidity build system
 * @param testFiles The test files, as provided by the user
 * @param resolvedTestFilesArgument The resolved testFiles
 */
async function validateThatProvidedFilesAreTests(
  solidity: SolidityBuildSystem,
  testFiles: string[],
  resolvedTestFilesArgument: string[],
) {
  const existsResults = await Promise.all(
    resolvedTestFilesArgument.map((rootPath) => exists(rootPath)),
  );

  const missing: string[] = testFiles.filter((_, i) => !existsResults[i]);

  if (missing.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SELECTED_TEST_FILES_DO_NOT_EXIST,
      {
        files: missing.map((f) => `- ${f}`).join("\n"),
      },
    );
  }

  const scopes = await Promise.all(
    resolvedTestFilesArgument.map((rootPath) => solidity.getScope(rootPath)),
  );

  const nonTests: string[] = testFiles.filter((_, i) => scopes[i] !== "tests");

  if (nonTests.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.SELECTED_FILES_ARE_NOT_SOLIDITY_TESTS,
      {
        files: nonTests.map((f) => `- ${f}`).join("\n"),
      },
    );
  }
}

async function loadArtifacts(
  solidity: SolidityBuildSystem,
  scopes: BuildScope[],
): Promise<{
  edrArtifactsWithMetadata: EdrArtifactWithMetadata[];
  allBuildInfosAndOutputs: BuildInfoAndOutput[];
}> {
  const edrArtifactsWithMetadata: EdrArtifactWithMetadata[] = [];
  const allBuildInfosAndOutputs: BuildInfoAndOutput[] = [];
  for (const scope of scopes) {
    const artifactsDir = await solidity.getArtifactsDirectory(scope);
    const artifactManager = new ArtifactManagerImplementation(artifactsDir);
    edrArtifactsWithMetadata.push(
      ...(await buildEdrArtifactsWithMetadata(artifactManager)),
    );
    allBuildInfosAndOutputs.push(
      ...(await getBuildInfosAndOutputs(artifactManager)),
    );
  }
  return { edrArtifactsWithMetadata, allBuildInfosAndOutputs };
}

export default runSolidityTests;
