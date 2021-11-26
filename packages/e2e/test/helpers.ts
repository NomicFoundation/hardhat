import fsExtra from "fs-extra";
import os from "os";
import path from "path";
import shell from "shelljs";

declare module "mocha" {
  interface Context {
    testDirPath: string;
  }
}

export function useFixture(project: string) {
  before(`using project "${project}"`, function () {
    const fixturePath = path.join(__dirname, "fixture-projects", project);

    const tmpDirContainer = os.tmpdir();
    this.testDirPath = path.join(tmpDirContainer, `hardhat-e2e-${project}`);

    fsExtra.ensureDirSync(this.testDirPath);
    fsExtra.emptyDirSync(this.testDirPath);

    fsExtra.copySync(fixturePath, this.testDirPath);

    shell.cd(this.testDirPath);

    // install hardhat locally
    const isYarn = process.env.HARDHAT_E2E_IS_YARN === "true";
    const hardhatPackagePath = process.env.HARDHAT_E2E_PATH_TO_HARDHAT_TGZ;

    if (isYarn) {
      shell.exec(`yarn add ${hardhatPackagePath}`);
    } else {
      shell.exec(`npm install ${hardhatPackagePath}`);
    }
  });
}
