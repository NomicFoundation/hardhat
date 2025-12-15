import type { HardhatConfig } from "hardhat/types/config";
import type { NewTaskActionFunction } from "hardhat/types/tasks";
import type { LastParameter } from "hardhat/types/utils";

import { pipeline } from "node:stream/promises";
import { run } from "node:test";
import { URL } from "node:url";

import { hardhatTestReporter } from "@nomicfoundation/hardhat-node-test-reporter";
import { setGlobalOptionsAsEnvVariables } from "@nomicfoundation/hardhat-utils/env";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";
import {
  markTestRunStart as initCoverage,
  markTestRunDone as reportCoverage,
} from "hardhat/internal/coverage";
import {
  markTestRunStart as initGasStats,
  markTestRunDone as reportGasStats,
} from "hardhat/internal/gas-analytics";

interface TestActionArguments {
  testFiles: string[];
  only: boolean;
  grep?: string;
  noCompile: boolean;
  testSummaryIndex: number;
}

function isTypescriptFile(path: string): boolean {
  return /\.(ts|cts|mts)$/i.test(path);
}

function isJavascriptFile(path: string): boolean {
  return /\.(js|cjs|mjs)$/i.test(path);
}

function isSubtestFailedError(error: Error): boolean {
  return (
    "code" in error &&
    "failureType" in error &&
    error.code === "ERR_TEST_FAILURE" &&
    error.failureType === "subtestsFailed"
  );
}

async function getTestFiles(
  testFiles: string[],
  config: HardhatConfig,
): Promise<string[]> {
  if (testFiles.length !== 0) {
    return testFiles;
  }

  return getAllFilesMatching(
    config.paths.tests.nodejs,
    (f) => isJavascriptFile(f) || isTypescriptFile(f),
  );
}

/**
 * Note that we are testing this manually for now as you can't run a node:test within a node:test
 */
const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, only, grep, noCompile, testSummaryIndex },
  hre,
) => {
  // Set an environment variable that plugins can use to detect when a process is running tests
  process.env.HH_TEST = "true";

  // Sets the NODE_ENV environment variable to "test" so the code can detect that tests are running
  // This is done by other JS/TS test frameworks like vitest
  process.env.NODE_ENV ??= "test";

  setGlobalOptionsAsEnvVariables(hre.globalOptions);

  if (!noCompile) {
    await hre.tasks.getTask("build").run({
      noTests: true,
    });
    console.log();
  }

  const files = await getTestFiles(testFiles, hre.config);

  if (files.length === 0) {
    return 0;
  }

  const imports = [];

  const tsx = new URL(import.meta.resolve("tsx/esm"));
  imports.push(tsx.href);

  if (hre.globalOptions.coverage === true) {
    const coverage = new URL(
      import.meta.resolve("@nomicfoundation/hardhat-node-test-runner/coverage"),
    );
    imports.push(coverage.href);
  }

  if (hre.globalOptions.gasStats === true) {
    const gasStats = new URL(
      import.meta.resolve(
        "@nomicfoundation/hardhat-node-test-runner/gas-stats",
      ),
    );
    imports.push(gasStats.href);
  }

  process.env.NODE_OPTIONS = imports
    .map((href) => `--import "${href}"`)
    .join(" ");

  async function runTests(): Promise<{
    testSummary: {
      failed: number;
      passed: number;
      skipped: number;
      todo: number;
      failureOutput: string;
    };
  }> {
    const nodeTestOptions: LastParameter<typeof run> = {
      files,
      only,
      concurrency: true, // uses `os.availableParallelism() - 1`
    };

    if (grep !== undefined && grep !== "") {
      nodeTestOptions.testNamePatterns = grep;
    }

    const testOnlyMessage =
      "'only' and 'runOnly' require the --only command-line option.";
    const customReporter = hardhatTestReporter(nodeTestOptions, {
      testOnlyMessage,
      testSummaryIndex,
    });

    console.log("Running node:test tests");
    console.log();

    let failed = 0;
    let passed = 0;
    let skipped = 0;
    let todo = 0;
    let failureOutput = "";

    const reporterStream = run(nodeTestOptions)
      .on("test:fail", (event) => {
        if (event.details.type === "suite") {
          // If a suite failed only because a subtest failed, we don't want to
          // count it as a failure since the subtest failure will be reported as well
          if (isSubtestFailedError(event.details.error)) {
            return;
          }
        }

        failed++;
      })
      .on("test:summary", ({ counts }) => {
        passed = counts.passed;
        skipped = counts.skipped;
        todo = counts.todo;
      })
      .compose(async function* (source) {
        const reporter = customReporter(source);

        for await (const value of reporter) {
          if (typeof value === "string") {
            yield value;
          } else {
            failed = value.failed;
            passed = value.passed;
            skipped = value.skipped;
            todo = value.todo;
            failureOutput = value.failureOutput;
          }
        }
      });

    const outputStream = createNonClosingWriter(process.stdout);

    await pipeline(reporterStream, outputStream);

    return {
      testSummary: {
        failed,
        passed,
        skipped,
        todo,
        failureOutput,
      },
    };
  }

  await initCoverage("nodejs");
  await initGasStats("nodejs");

  const testResults = await runTests();

  // NOTE: This might print a coverage report.
  await reportCoverage("nodejs");
  await reportGasStats("nodejs");

  if (testResults.testSummary.failed > 0) {
    process.exitCode = 1;
  }

  console.log();

  return testResults;
};

export default testWithHardhat;
