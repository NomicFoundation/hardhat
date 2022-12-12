import fsExtra from "fs-extra";
import * as os from "os";
import path from "path";
import { getRealPath } from "../../src/internal/util/fs-utils";

declare module "mocha" {
  interface Context {
    tmpDir: string;
  }
}

async function getEmptyTmpDir(nameHint: string) {
  const tmpDirContainer = await getRealPath(os.tmpdir());

  const tmpDir = path.join(tmpDirContainer, `hardhat-tests-${nameHint}`);
  await fsExtra.ensureDir(tmpDir);
  await fsExtra.emptyDir(tmpDir);

  return tmpDir;
}

export function useTmpDir(nameHint: string) {
  nameHint = nameHint.replace(/\s+/, "-");

  beforeEach("Creating tmp dir", async function () {
    this.tmpDir = await getEmptyTmpDir(nameHint);
  });
}
