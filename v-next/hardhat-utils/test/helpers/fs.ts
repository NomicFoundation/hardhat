import { beforeEach } from "node:test";

import { getEmptyTmpDir } from "../../src/fs.js";

export function useTmpDir(nameHint: string) {
  nameHint = nameHint.replace(/\s+/, "-");
  let tmpDir: string;

  beforeEach(async function () {
    tmpDir = await getEmptyTmpDir(`hardhat-utils-tests-${nameHint}`);
  });

  return (): string => tmpDir;
}
