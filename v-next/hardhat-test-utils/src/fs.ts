import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, afterEach } from "node:test";

import {
  ensureDir,
  getRealPath,
  emptyDir,
  remove,
} from "@ignored/hardhat-vnext-utils/fs";

/**
 * Creates a tmp directory before each test, and removes it after each test.
 * @param nameHint - A hint to use as part of  name of the tmp directory.
 */
export function useTmpDir(nameHint: string = "tmp-dir"): void {
  let previousWorkingDir: string;
  let tmpDir: string;

  beforeEach(async function () {
    previousWorkingDir = process.cwd();

    const tmpDirContainer = await getRealPath(tmpdir());

    tmpDir = path.join(tmpDirContainer, `hardhat-tests-${nameHint}`);
    await ensureDir(tmpDir);
    await emptyDir(tmpDir);

    process.chdir(tmpDir);
  });

  afterEach(async function () {
    process.chdir(previousWorkingDir);
    await remove(tmpDir);
  });
}
