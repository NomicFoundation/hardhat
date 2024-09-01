import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatKeystorePlugin from "../../src/index.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/hardhat-keystore-file-location-override-plugin.js";

const existingKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "../../fixture-projects/unencrypted-keystore/existing-keystore.json",
);

const nonexistantKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "../../fixture-projects/unencrypted-keystore/keystore.json",
);

describe("hook", () => {
  let hre: HardhatRuntimeEnvironment;

  describe("when the keystore file has been setup", () => {
    beforeEach(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(existingKeystoreFilePath),
        ],
      });
    });

    it("should invoke the keystore and return the value from it", async () => {
      // Configure and run the hook
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: "key1",
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "unexpected-default-value";
        },
      );

      assert.equal(resultValue, "value1");
    });

    it("should invoke the next function because the keystore is found but the key is not present", async () => {
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: "non-existant-key-in-keystore",
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "value-from-hardhat-package-not-keystore";
        },
      );

      assert.equal(resultValue, "value-from-hardhat-package-not-keystore");
    });
  });

  describe("when the keystore file has not been setup", () => {
    beforeEach(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(nonexistantKeystoreFilePath),
        ],
      });
    });

    it("should invoke the next function because no keystore is found", async () => {
      const configVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: "key1",
      };

      const resultValue = await hre.hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [configVar],
        async (_context, _configVar) => {
          return "value-from-hardhat-package";
        },
      );

      assert.equal(resultValue, "value-from-hardhat-package");
    });
  });
});
