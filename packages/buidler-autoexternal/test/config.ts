import { assert } from "chai";
import fsExtra from "fs-extra";

import { DEFAULT_CONFIG, getAutoexternalConfig } from "../src/config";
import { generateTestableContract } from "../src/contracts";

import { useEnvironment } from "./helpers";

describe("autoexternal config", function() {
  describe("default config", function() {
    useEnvironment(__dirname + "/buidler-project");

    it("default values should work as expected", function() {
      assert.equal(
        DEFAULT_CONFIG.enableForFileAnnotation,
        "#buidler-autoexternal"
      );

      assert.isTrue(
        DEFAULT_CONFIG.exportableFunctionNamePattern.test("_internalFunction")
      );

      assert.isFalse(
        DEFAULT_CONFIG.exportableFunctionNamePattern.test("internalFunction")
      );

      assert.equal(
        DEFAULT_CONFIG.functionNameTransformer("_internalFunction"),
        "internalFunction"
      );

      assert.equal(
        DEFAULT_CONFIG.contractNameTransformer("Contract"),
        "TestableContract"
      );
    });
  });

  describe("custom config", function() {
    useEnvironment(__dirname + "/custom-config-project");

    beforeEach("clear cache directory", async function() {
      await fsExtra.emptyDir(this.env.config.paths.cache);
    });

    it("Should parse file with custom annotation", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        getAutoexternalConfig(this.env.config),
        __dirname + "/custom-config-project/contracts/WithCustomAnnotation.sol"
      );

      assert.isDefined(testableContractPath);
    });

    it("Should not parse file without the custom annotation", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        getAutoexternalConfig(this.env.config),
        __dirname +
          "/custom-config-project/contracts/WithoutCustomAnnotation.sol"
      );

      assert.isUndefined(testableContractPath);
    });
  });
});
