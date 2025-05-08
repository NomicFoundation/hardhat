import { beforeEach, afterEach } from "node:test";

import { mkdtemp } from "@nomicfoundation/hardhat-utils/fs";

/**
 * Create a tmp directory.
 * @param nameHint - A hint to use as part of the name of the tmp directory.
 */
export async function getTmpDir(nameHint: string = "tmp-dir"): Promise<string> {
  const tmpDir = await mkdtemp(`hardhat-tests-${nameHint}`);
  return tmpDir;
}

/**
 * Creates a tmp directory before each test, and removes it after each test.
 * @param nameHint - A hint to use as part of the name of the tmp directory.
 */
export function useTmpDir(nameHint: string = "tmp-dir"): void {
  let previousWorkingDir: string;
  let tmpDir: string;

  beforeEach(async function () {
    previousWorkingDir = process.cwd();

    tmpDir = await getTmpDir(nameHint);

    process.chdir(tmpDir);
  });

  afterEach(async function () {
    process.chdir(previousWorkingDir);
  });
}
