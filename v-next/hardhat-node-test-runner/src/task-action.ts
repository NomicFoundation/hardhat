import type { HardhatConfig } from "hardhat/types/config";
import type { NewTaskActionFunction } from "hardhat/types/tasks";
import type { LastParameter } from "hardhat/types/utils";

import { pipeline } from "node:stream/promises";
import { run } from "node:test";
import { URL } from "node:url";

import { hardhatTestReporter } from "@nomicfoundation/hardhat-node-test-reporter";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";

interface TestActionArguments {
  testFiles: string[];
  only: boolean;
  grep: string;
  noCompile: boolean;
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
    config.paths.tests.nodeTest,
    (f) => isJavascriptFile(f) || isTypescriptFile(f),
  );
}

/**
 * Note that we are testing this manually for now as you can't run a node:test within a node:test
 */
const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, only, grep, noCompile },
  hre,
) => {
  if (!noCompile) {
    await hre.tasks.getTask("compile").run({});
    console.log();
  }

  const files = await getTestFiles(testFiles, hre.config);

  if (files.length === 0) {
    return 0;
  }

  const tsx = new URL(import.meta.resolve("tsx/esm"));
  const imports = [tsx.href];

  if (hre.globalOptions.coverage === true) {
    const coverage = new URL(
      import.meta.resolve("@nomicfoundation/hardhat-node-test-coverage"),
    );
    imports.push(coverage.href);
  }

  process.env.NODE_OPTIONS = imports.map((i) => `--import ${i}`).join(" ");

  async function runTests(): Promise<number> {
    let failures = 0;

    const nodeTestOptions: LastParameter<typeof run> = { files, only };

    if (grep !== "") {
      nodeTestOptions.testNamePatterns = grep;
    }

    const testOnlyMessage =
      "'only' and 'runOnly' require the --only command-line option.";
    const customReporter = hardhatTestReporter(nodeTestOptions, {
      testOnlyMessage,
    });

    console.log("Running node:test tests");
    console.log();

    const reporterStream = run(nodeTestOptions)
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
      .compose(customReporter);

    await pipeline(reporterStream, createNonClosingWriter(process.stdout));

    return failures;
  }

  const testFailures = await runTests();

  if (testFailures > 0) {
    process.exitCode = 1;
  }

  console.log();

  return testFailures;
};

export default testWithHardhat;
