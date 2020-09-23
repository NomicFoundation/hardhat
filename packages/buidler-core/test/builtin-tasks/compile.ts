import { assert } from "chai";
import * as fsExtra from "fs-extra";
import * as path from "path";

import { SOLIDITY_FILES_CACHE_FILENAME } from "../../src/internal/constants";
import { globSync } from "../../src/internal/util/glob";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function assertFileExists(pathToFile: string) {
  assert.isTrue(
    fsExtra.existsSync(pathToFile),
    `Expected ${pathToFile} to exist`
  );
}

function assertBuildInfoExists(pathToDbg: string) {
  assertFileExists(pathToDbg);
  const { buildInfo } = fsExtra.readJsonSync(pathToDbg);
  assertFileExists(path.resolve(path.dirname(pathToDbg), buildInfo));
}

describe("compile task", function () {
  beforeEach(function () {
    fsExtra.removeSync("artifacts");
    fsExtra.removeSync(path.join("cache", SOLIDITY_FILES_CACHE_FILENAME));
  });

  describe("project with single file", function () {
    useFixtureProject("compilation-single-file");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );
      assert.lengthOf(globSync("artifacts/build-info/*.json"), 1);
    });
  });

  describe("project with two files with different compiler versions", function () {
    useFixtureProject("compilation-two-files-different-versions");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertFileExists(path.join("artifacts", "contracts", "B.sol", "B.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "B.sol", "B.dbg.json")
      );
      assert.lengthOf(globSync("artifacts/build-info/*.json"), 2);
    });
  });
});
