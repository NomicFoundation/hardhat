import type { HardhatConfig } from "@ignored/hardhat-vnext-core/types/config";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";
import type { MochaOptions } from "mocha";

import { resolve as pathResolve } from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { findUp, getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";
import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

interface TestActionArguments {
  testFiles: string[];
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
    config.paths.tests,
    (f) => isJavascriptFile(f) || isTypescriptFile(f),
  );
}

async function hasTypescriptConfig(): Promise<boolean> {
  const hhConfig = await findUp("hardhat.config.ts");

  return hhConfig !== undefined;
}

let testsAlreadyRun = false;
const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles },
  hre,
) => {
  const files = await getTestFiles(testFiles, hre.config);

  // the second check is needed for the case of a user having a hardhat.config.ts file
  // but all their test files are js files. probably an edge case, but we should handle it
  if (files.some((f) => isTypescriptFile(f)) || (await hasTypescriptConfig())) {
    try {
      import.meta.resolve("typescript");
    } catch {
      throw new HardhatError(
        HardhatError.ERRORS.GENERAL.TYPESCRIPT_NOT_INSTALLED,
      );
    }

    try {
      import.meta.resolve("tsx");
    } catch {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.TSX_NOT_INSTALLED);
    }

    process.env.NODE_OPTIONS = "--import tsx";
  }

  const { default: Mocha } = await import("mocha");

  const mochaConfig: MochaOptions = { ...hre.config.mocha };

  const mocha = new Mocha(mochaConfig);

  files.forEach((file) => mocha.addFile(file));

  // if the project is of type "module" or if there's some ESM test file,
  // we call loadFilesAsync to enable Mocha's ESM support
  const projectPackageJson = await readClosestPackageJson(import.meta.url);
  const isTypeModule = projectPackageJson.type === "module";
  const hasEsmTest = files.some((file) => file.endsWith(".mjs"));

  if (isTypeModule || hasEsmTest) {
    // Because of the way the ESM cache works, loadFilesAsync doesn't work
    // correctly if used twice within the same process, so we throw an error
    // in that case
    if (testsAlreadyRun) {
      throw new HardhatError(
        HardhatError.ERRORS.BUILTIN_TASKS.TEST_TASK_ESM_TESTS_RUN_TWICE,
      );
    }
    testsAlreadyRun = true;

    // This instructs Mocha to use the more verbose file loading infrastructure
    // which supports both ESM and CJS
    await mocha.loadFilesAsync();
  }

  await new Promise<number>((resolve) => {
    mocha.run(resolve);
  });
};

export default testWithHardhat;
