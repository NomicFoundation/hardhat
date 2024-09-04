import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatKeystorePlugin from "../../src/index.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";

const existingKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "unencrypted-keystore",
  "existing-keystore.json",
);

const nonExistingKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "unencrypted-keystore",
  "keystore.json",
);

const exampleConfigurationVariable: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key1",
};

describe("hook-handlers - configuration variables - fetchValue", () => {
  let hre: HardhatRuntimeEnvironment;

  describe("when there is an existing valid keystore file", () => {
    beforeEach(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(existingKeystoreFilePath),
        ],
      });
    });

    describe("successful get on a key in the keystore", () => {
      let resultValue: string;

      beforeEach(async () => {
        resultValue = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [exampleConfigurationVariable],
          async (_context, _configVar) => {
            return "unexpected-default-value";
          },
        );
      });

      it("should the value for the key in the keystore", async () => {
        assert.equal(resultValue, "value1");
      });
    });

    describe("where the key is not in the keystore", () => {
      let resultValue: string;

      beforeEach(async () => {
        resultValue = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [
            {
              ...exampleConfigurationVariable,
              name: "non-existant-key-in-keystore",
            },
          ],
          async (_context, _configVar) => {
            return "value-from-hardhat-package-not-keystore";
          },
        );
      });

      it("should invoke the next function because the keystore is found but the key is not present", async () => {
        assert.equal(resultValue, "value-from-hardhat-package-not-keystore");
      });
    });

    describe("caching", () => {
      describe("on a second get against the same hre", () => {
        let resultValue2: string;

        beforeEach(async () => {
          const resultValue = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key1" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );

          assert.equal(resultValue, "value1");

          // Set a new keystore path.
          // Without the cache, it should fail to find the key because the keystore file does not exist.
          // However, since the value is cached, it should return the value even if the keystore file path is missing.
          hre.config.keystore.filePath = nonExistingKeystoreFilePath;

          resultValue2 = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key2" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );
        });

        it("should successfully get a key on", async () => {
          assert.equal(resultValue2, "value2");
        });
      });
    });
  });

  describe("when the keystore file has not been setup", () => {
    describe("when trying to get a value", () => {
      let resultValue: string;

      beforeEach(async () => {
        hre = await createHardhatRuntimeEnvironment({
          plugins: [
            hardhatKeystorePlugin,
            setupKeystoreFileLocationOverrideAt(nonExistingKeystoreFilePath),
          ],
        });

        resultValue = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [exampleConfigurationVariable],
          async (_context, _configVar) => {
            return "value-from-hardhat-package";
          },
        );
      });

      it("should invoke the next function because no keystore is found", async () => {
        assert.equal(resultValue, "value-from-hardhat-package");
      });
    });

    describe("caching", () => {
      describe("on a second get against the same hre", () => {
        let resultValue2: string;

        beforeEach(async () => {
          const resultValue = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key1" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );

          assert.equal(resultValue, "unexpected-default-value");

          // Set a new keystore path.
          // Without the cache, it should find the key because the keystore file does exist.
          // However, since the value is cached, it should return that the value does not exist.
          hre.config.keystore.filePath = existingKeystoreFilePath;

          resultValue2 = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key2" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );
        });

        it("should successfully get a key on", async () => {
          assert.equal(resultValue2, "unexpected-default-value");
        });
      });
    });
  });
});
