import { assert } from "chai";

import { DEFAULT_CONFIG, getAutoexternalConfig } from "../src/config";

import { useEnvironment } from "./helpers";

describe("Autoexternal config", function() {
  describe("Autoexternal config getter", function() {
    useEnvironment(__dirname + "/buidler-project");

    it("Should return a complete and right config", function() {
      const config = getAutoexternalConfig(this.env.config);

      assert.equal(
        config.enableForFileAnnotation,
        DEFAULT_CONFIG.enableForFileAnnotation
      );

      assert.equal(
        config.exportableFunctionNamePattern,
        DEFAULT_CONFIG.exportableFunctionNamePattern
      );

      assert.equal(
        config.functionNameTransformer,
        DEFAULT_CONFIG.functionNameTransformer
      );

      assert.equal(
        config.contractNameTransformer,
        DEFAULT_CONFIG.contractNameTransformer
      );
    });
  });

  describe("default config", function() {
    useEnvironment(__dirname + "/buidler-project");

    it("default values should work as expected", function() {
      const config = getAutoexternalConfig(this.env.config);

      assert.equal(config.enableForFileAnnotation, "#buidler-autoexternal");

      assert.isTrue(
        config.exportableFunctionNamePattern.test("_internalFunction")
      );

      assert.isFalse(
        config.exportableFunctionNamePattern.test("internalFunction")
      );

      assert.equal(
        config.functionNameTransformer("_internalFunction"),
        "internalFunction"
      );

      assert.equal(
        config.contractNameTransformer("Contract"),
        "TestableContract"
      );
    });
  });

  describe("custom config", function() {
    useEnvironment(__dirname + "/custom-config-project");

    it("Should load a custom config", async function() {
      const config = getAutoexternalConfig(this.env.config);

      assert.equal(config.enableForFileAnnotation, "#custom-annotation");

      assert.isFalse(
        config.exportableFunctionNamePattern.test("_internalFunction")
      );

      assert.isTrue(
        config.exportableFunctionNamePattern.test("customFunction")
      );

      assert.equal(
        config.functionNameTransformer("customFunction"),
        "transformedcustomFunction"
      );

      assert.equal(
        config.contractNameTransformer("Contract"),
        "CustomContract"
      );
    });
  });
});
