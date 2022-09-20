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

    if (hardhatPackagePath === undefined || hardhatPackagePath === "") {
      throw new Error(
        "Undefined or empty environment variable: HARDHAT_E2E_PATH_TO_HARDHAT_TGZ"
      );
    }

    if (isYarn) {
      if (fsExtra.existsSync("package.json")) {
        shell.exec("yarn");
      }
      shell.exec(`yarn add ${hardhatPackagePath}`);
    } else {
      if (fsExtra.existsSync("package.json")) {
        shell.exec("npm install");
      }
      shell.exec(`npm install ${hardhatPackagePath}`);
    }
  });
}
