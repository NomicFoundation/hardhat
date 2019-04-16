import { assert } from "chai";
import fsExtra from "fs-extra";

import { DEFAULT_CONFIG, getAutoexternConfig } from "../src/config";
import { generateTestableContract } from "../src/contracts";

import { useEnvironment } from "./helpers";

describe("autoextern config", function() {
  describe("default config", function() {
    it("default values should work as expected", function() {
      assert.equal(
        DEFAULT_CONFIG.functionNameTransformer("_internalFunction"),
        "internalFunction"
      );
      assert.isTrue(
        DEFAULT_CONFIG.exportableFunctionNamePattern.test("_internalFunction")
      );
      assert.isFalse(
        DEFAULT_CONFIG.exportableFunctionNamePattern.test("externalFunction")
      );
      assert.equal(
        DEFAULT_CONFIG.contractNameTransformer("Contract"),
        "TestableContract"
      );
    });
  });

  describe("custom config", function() {
    useEnvironment(__dirname + "/custom-config-project");

    before(async function() {
      this.parser = await import("solidity-parser-antlr");
    });

    beforeEach("clear cache directory", async function() {
      await fsExtra.emptyDir(this.env.config.paths.cache);
    });

    it("Should parse file with custom annotation", async function() {
      const testableContractPath = await generateTestableContract(
        this.env.config.paths,
        getAutoexternConfig(this.env.config),
        __dirname + "/custom-config-project/contracts/WithCustomAnnotation.sol"
      );

      assert.isUndefined(testableContractPath);
    });
  });
});
