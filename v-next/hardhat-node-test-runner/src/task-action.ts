import type { HardhatConfig } from "@ignored/hardhat-vnext/types/config";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { finished } from "node:stream/promises";
import { run } from "node:test";
import { fileURLToPath } from "node:url";

import hardhatTestReporter from "@ignored/hardhat-vnext-node-test-reporter";
import { getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";

interface TestActionArguments {
  testFiles: string[];
  only: boolean;
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
    config.paths.tests,
    (f) => isJavascriptFile(f) || isTypescriptFile(f),
  );
}

/**
 * Note that we are testing this manually for now as you can't run a node:test within a node:test
 */
const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, only },
  hre,
) => {
  const files = await getTestFiles(testFiles, hre.config);

  const tsx = fileURLToPath(import.meta.resolve("tsx/esm"));
  process.env.NODE_OPTIONS = `--import ${tsx}`;

  async function runTests(): Promise<number> {
    let failures = 0;
    const reporterStream = run({ files, only })
      .on("test:fail", (event) => {
        if (event.details.type === "suite") {
          // If a suite failed only because a subtest failed, we don't want to
          // count it as a failure since the subtest failure will be reported as well
          if (isSubtestFailedError(event.details.error)) {
            return;
          }
        }

        failures++;
      })
      .compose(hardhatTestReporter);

    reporterStream.pipe(process.stdout);

    await finished(reporterStream);

    return failures;
  }

  const testFailures = await runTests();
  console.log("Failures: ", testFailures);

  if (testFailures > 0) {
    process.exitCode = testFailures;
  }

  return testFailures;
};

export default testWithHardhat;
