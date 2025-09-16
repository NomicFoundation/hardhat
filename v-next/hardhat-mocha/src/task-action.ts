import type { HardhatConfig } from "hardhat/types/config";
import type { NewTaskActionFunction } from "hardhat/types/tasks";
import type { MochaOptions } from "mocha";

import { resolve as pathResolve } from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { setGlobalOptionsAsEnvVariables } from "@nomicfoundation/hardhat-utils/env";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import {
  markTestRunStart as initCoverage,
  markTestWorkerDone as saveCoverageData,
  markTestRunDone as reportCoverage,
} from "hardhat/internal/coverage";
import {
  markTestRunStart as initGasStats,
  markTestWorkerDone as saveGasStats,
  markTestRunDone as reportGasStats,
} from "hardhat/internal/gas-analytics";

interface TestActionArguments {
  testFiles: string[];
  bail: boolean;
  grep?: string;
  noCompile: boolean;
}

function isTypescriptFile(path: string): boolean {
  return /\.(ts|cts|mts)$/i.test(path);
}

function isJavascriptFile(path: string): boolean {
  return /\.(js|cjs|mjs)$/i.test(path);
}

async function getTestFiles(
  testFiles: string[],
  config: HardhatConfig,
): Promise<string[]> {
  if (testFiles.length !== 0) {
    const testFilesAbsolutePaths = testFiles.map((x) =>
      pathResolve(process.cwd(), x),
    );

    return testFilesAbsolutePaths;
  }

  return getAllFilesMatching(
    config.paths.tests.mocha,
    (f) => isJavascriptFile(f) || isTypescriptFile(f),
  );
}

let testsAlreadyRun = false;
const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, bail, grep, noCompile },
  hre,
) => {
  // Set an environment variable that plugins can use to detect when a process is running tests
  process.env.HH_TEST = "true";

  // Sets the NODE_ENV environment variable to "test" so the code can detect that tests are running
  // This is done by other JS/TS test frameworks like vitest
  process.env.NODE_ENV ??= "test";

  setGlobalOptionsAsEnvVariables(hre.globalOptions);

  if (!noCompile) {
    await hre.tasks.getTask("compile").run({});
    console.log();
  }

  const files = await getTestFiles(testFiles, hre.config);

  if (files.length === 0) {
    return;
  }

  const unhandledRejectionHookPath = "./unhandled-rejection-mocha-hook.js";

  if (hre.config.test.mocha.parallel === true) {
    const imports = [];

    const tsx = new URL(import.meta.resolve("tsx/esm"));
    const unhandledRejectionHook = new URL(
      import.meta.resolve(unhandledRejectionHookPath),
    );
    imports.push(tsx.href);

    hre.config.test.mocha.require = hre.config.test.mocha.require ?? [];
    hre.config.test.mocha.require.push(unhandledRejectionHook.href);

    if (hre.globalOptions.coverage === true) {
      const coverage = new URL(
        import.meta.resolve("@nomicfoundation/hardhat-mocha/coverage"),
      );

      hre.config.test.mocha.require.push(coverage.href);
    }

    if (hre.globalOptions.gasStats === true) {
      const gasStats = new URL(
        import.meta.resolve("@nomicfoundation/hardhat-mocha/gas-stats"),
      );

      hre.config.test.mocha.require = hre.config.test.mocha.require ?? [];
      hre.config.test.mocha.require.push(gasStats.href);
    }

    process.env.NODE_OPTIONS = imports
      .map((href) => `--import "${href}"`)
      .join(" ");
  } else {
    // Import the handler directly when not running in parallel mode
    await import(unhandledRejectionHookPath);
  }

  const { default: Mocha } = await import("mocha");

  const mochaConfig: MochaOptions = { ...hre.config.test.mocha };

  if (grep !== undefined && grep !== "") {
    mochaConfig.grep = grep;
  }

  if (bail) {
    mochaConfig.bail = true;
  }

  const mocha = new Mocha(mochaConfig);

  files.forEach((file) => mocha.addFile(file));

  // Because of the way the ESM cache works, loadFilesAsync doesn't work
  // correctly if used twice within the same process, so we throw an error
  // in that case
  if (testsAlreadyRun) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.TEST_TASK_ESM_TESTS_RUN_TWICE,
    );
  }
  testsAlreadyRun = true;

  // We write instead of console.log because Mocha already prints some newlines
  process.stdout.write("Running Mocha tests\n");

  // This instructs Mocha to use the more verbose file loading infrastructure
  // which supports both ESM and CJS
  await mocha.loadFilesAsync();

  await initCoverage("mocha");
  await initGasStats("mocha");

  const testFailures = await new Promise<number>((resolve) => {
    mocha.run(resolve);
  });

  if (hre.config.test.mocha.parallel !== true) {
    // NOTE: We execute mocha tests in the main process.
    await saveCoverageData("mocha");
    await saveGasStats("mocha");
  }
  // NOTE: This might print a coverage report.
  await reportCoverage("mocha");
  await reportGasStats("mocha");

  if (testFailures > 0) {
    process.exitCode = 1;
  }

  console.log();

  return testFailures;
};

export default testWithHardhat;
