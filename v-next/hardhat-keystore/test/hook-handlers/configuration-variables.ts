import type { UnencryptedKeystoreFile } from "../../src/internal/types.js";
import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import { remove, writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import hardhatKeystorePlugin from "../../src/index.js";
import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";

const configurationVariableKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "unencrypted-keystore",
  "config-variables-keystore.json",
);

const nonExistingKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "unencrypted-keystore",
  "nonexistent-keystore.json",
);

const exampleConfigurationVariable: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key1",
};

describe("hook-handlers - configuration variables - fetchValue", () => {
  let hre: HardhatRuntimeEnvironment;
  let runningInCi: boolean;

  // The config variables hook handler short circuits if running in CI
  // intentionally. In this integration test we check whether we are running
  // in _our_ CI, and turn of `process.env.CI` for the duration of this
  // test suite, then turn it back on again at the end.
  before(async () => {
    if (isCi()) {
      console.log(
        "---------------------> determined that we are running in CI with before",
      );
      runningInCi = true;
    }

    if (runningInCi) {
      console.log(
        "---------------------> removed the CI for duration of test suite",
      );
      delete process.env.CI;
    }
  });

  after(() => {
    if (runningInCi) {
      process.env.CI = "true";
    }
  });

  describe("when there is an existing valid keystore file", () => {
    beforeEach(async () => {
      await remove(configurationVariableKeystoreFilePath);

      const keystoreFile: UnencryptedKeystoreFile =
        UnencryptedKeystore.createEmptyUnencryptedKeystoreFile();

      keystoreFile.keys.key1 = "value1";
      keystoreFile.keys.key2 = "value2";

      await writeJsonFile(configurationVariableKeystoreFilePath, keystoreFile);

      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(
            configurationVariableKeystoreFilePath,
          ),
        ],
      });
    });

    afterEach(async () => {
      await remove(configurationVariableKeystoreFilePath);
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
              name: "non-existent-key-in-keystore",
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

          // After the initial read, overwrite the keystore file with
          // empty keys to ensure the cache is being used
          await writeJsonFile(
            configurationVariableKeystoreFilePath,
            UnencryptedKeystore.createEmptyUnencryptedKeystoreFile(),
          );

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

      it("should invoke the next function and return its value because no keystore is found", async () => {
        assert.equal(resultValue, "value-from-hardhat-package");
      });
    });
  });
});
