import { beforeEach } from "node:test";
import fsPromises from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { getRealPath, mkdir } from "../../src/fs.js";

async function getEmptyTmpDir(nameHint: string) {
  const tmpDirContainer = await getRealPath(os.tmpdir());

  const tmpDir = path.join(tmpDirContainer, `hardhat-utils-tests-${nameHint}`);
  await fsPromises.rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir);

  return tmpDir;
}

export function useTmpDir(nameHint: string) {
  nameHint = nameHint.replace(/\s+/, "-");
  let tmpDir: string;

  beforeEach(async function () {
    tmpDir = await getEmptyTmpDir(nameHint);
  });

  return () => tmpDir;
}
