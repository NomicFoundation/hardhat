import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";
import shell from "shelljs";

import { useFixture } from "./helpers";

const hardhatBinary = path.join("node_modules", ".bin", "hardhat");

describe("e2e tests", function () {
  describe("basic-proejct", function () {
    useFixture("basic-project");

    it("should compile", function () {
      const { code, stdout } = shell.exec(`${hardhatBinary} compile`);

      assert.equal(code, 0);

      const artifactsDir = path.join(this.testDirPath, "artifacts");

      assert.isTrue(fsExtra.existsSync(artifactsDir));
      assert.match(stdout, /Compilation finished successfully/);
    });
  });
});
