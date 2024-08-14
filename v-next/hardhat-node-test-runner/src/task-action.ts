import type { HardhatConfig } from "@ignored/hardhat-vnext/types/config";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { resolve } from "node:path";
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

const testWithHardhat: NewTaskActionFunction<TestActionArguments> = async (
  { testFiles, only },
  hre,
) => {
  const files = await getTestFiles(testFiles, hre.config);

  const tsx = fileURLToPath(import.meta.resolve("tsx/esm"));
  process.env.NODE_OPTIONS = `--import ${tsx}`;

  run({ files, only }).compose(hardhatTestReporter).pipe(process.stdout);
};

export default testWithHardhat;
