import type { HardhatConfig } from "@ignored/hardhat-vnext-core/types/config";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";

import { resolve } from "node:path";
import { run } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import hardhatTestReporter from "@ignored/hardhat-vnext-node-test-reporter";
import { findUp, getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";

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

async function getTestFiles(
  testFiles: string[],
  config: HardhatConfig,
): Promise<string[]> {
  if (testFiles.length !== 0) {
    const testFilesAbsolutePaths = testFiles.map((x) =>
      resolve(process.cwd(), x),
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

const runScriptWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, only },
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

  run({ files, only }).compose(hardhatTestReporter).pipe(process.stdout);
};

export default runScriptWithHardhat;
