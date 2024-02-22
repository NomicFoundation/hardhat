import { assert, expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fsExtra from "fs-extra";
import path from "path";

import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

import { VYPER_FILES_CACHE_FILENAME } from "../src/constants";
import {
  useEnvironment,
  useFixtureProject,
  assertFileExists,
  expectVyperErrorAsync,
} from "./helpers";

use(chaiAsPromised);

describe("Vyper plugin", function () {
  beforeEach(function () {
    fsExtra.removeSync("artifacts");
    fsExtra.removeSync(path.join("cache", VYPER_FILES_CACHE_FILENAME));
  });

  describe("project with single file", function () {
    useFixtureProject("compilation-single-file");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run(TASK_COMPILE);

      assertFileExists(path.join("artifacts", "contracts", "A.vy", "A.json"));
    });
  });

  describe("project with two files with different compiler versions", function () {
    useFixtureProject("compilation-two-files-different-versions");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run(TASK_COMPILE);

      assertFileExists(path.join("artifacts", "contracts", "A.vy", "A.json"));
      assertFileExists(path.join("artifacts", "contracts", "B.vy", "B.json"));
    });
  });

  describe("old versions of vyper", function () {
    useFixtureProject("old-vyper-versions");

    describe("project with an old version of vyper", function () {
      useEnvironment("old-vyper-version.js");

      it("should throw an error", async function () {
        await expectVyperErrorAsync(async () => {
          await this.env.run(TASK_COMPILE);
        }, "Unsupported vyper version: 0.1.0-beta.15");
      });
    });

    describe("project with an old version of vyper (multiple compilers)", function () {
      useEnvironment("old-vyper-version-multiple-compilers.js");

      it("should throw an error", async function () {
        await expectVyperErrorAsync(async () => {
          await this.env.run(TASK_COMPILE);
        }, "Unsupported vyper version: 0.1.0-beta.15");
      });
    });
  });

  describe("Mixed language", async function () {
    useFixtureProject("mixed-language");
    useEnvironment();

    it("Should successfully compile the contracts", async function () {
      await this.env.run(TASK_COMPILE);

      assert.strictEqual(
        this.env.artifacts.readArtifactSync("test").contractName,
        "test"
      );
      assert.strictEqual(
        this.env.artifacts.readArtifactSync("Greeter").contractName,
        "Greeter"
      );
    });
  });

  describe("project with file that cannot be compiled", function () {
    useFixtureProject("unmatched-compiler-version");
    useEnvironment();

    it("should throw an error", async function () {
      await expectVyperErrorAsync(async () => {
        await this.env.run(TASK_COMPILE);
      }, "The Vyper version pragma statement in this file doesn't match any of the configured compilers in your config.");
    });
  });

  describe("project produces abi without gas field", function () {
    useFixtureProject("generates-gas-field");
    useEnvironment();

    it("Should remove the gas field", async function () {
      await this.env.run(TASK_COMPILE);

      assert.isUndefined(
        JSON.parse(JSON.stringify(this.env.artifacts.readArtifactSync("A").abi))
          .gas
      );
    });
  });

  describe("project should not compile", function () {
    useFixtureProject("compilation-single-file-test-directive");
    useEnvironment();

    it("should throw an error because a test directive is present in the source file", async function () {
      const filePath = path.join(
        __dirname,
        "fixture-projects",
        "compilation-single-file-test-directive",
        "contracts",
        "A.vy"
      );

      await expect(this.env.run(TASK_COMPILE)).to.be.rejectedWith(
        `We found a test directive in the file at path ${filePath}.` +
          ` Test directives are a Brownie feature not supported by Hardhat.` +
          ` Learn more at https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-vyper#test-directives`
      );
    });
  });
});
