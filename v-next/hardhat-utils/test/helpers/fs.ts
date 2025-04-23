import os from "node:os";
import path from "node:path";
import { beforeEach } from "node:test";

import { getRealPath, mkdir, remove } from "../../src/fs.js";

async function getEmptyTmpDir(nameHint: string) {
  const tmpDirContainer = await getRealPath(os.tmpdir());

  const tmpDir = path.join(tmpDirContainer, `hardhat-utils-tests-${nameHint}`);
  await remove(tmpDir);
  await mkdir(tmpDir);

  return tmpDir;
}

export function useTmpDir(nameHint: string) {
  nameHint = nameHint.replace(/\s+/, "-");
  let tmpDir: string;

  beforeEach(async function () {
    tmpDir = await getEmptyTmpDir(nameHint);
  });

  return (): string => tmpDir;
}
