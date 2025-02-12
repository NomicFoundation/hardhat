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
import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
} from "../../src/internal/keystores/encryption.js";
import { setupKeystorePassword } from "../helpers/insert-password-hook.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const configurationVariableKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "config-variables-keystore.json",
);

const nonExistingKeystoreFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "nonexistent-keystore.json",
);

const exampleConfigurationVariable: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key1",
};

describe("hook-handlers - configuration variables - fetchValue", () => {
  let hre: HardhatRuntimeEnvironment;
  let runningInCi: boolean;

  let masterKey: Uint8Array;
  let salt: Uint8Array;

  // The config variables hook handler short circuits if running in CI
  // intentionally. In this integration test we check whether we are running
  // in _our_ CI - Github Actions, and turn off `process.env.GITHUB_ACTIONS`
  // for the duration of this test suite, then turn it back on again at the end.
  before(async () => {
    if (isCi()) {
      runningInCi = true;
    }

    if (runningInCi) {
      delete process.env.GITHUB_ACTIONS;
      delete process.env.CI;
    }
  });

  after(() => {
    if (runningInCi) {
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";
    }
  });

  describe("when there is an existing valid keystore file", () => {
    beforeEach(async () => {
      await remove(configurationVariableKeystoreFilePath);

      ({ masterKey, salt } = createMasterKey({
        password: TEST_PASSWORD,
      }));

      let keystoreFile = createEmptyEncryptedKeystore({ masterKey, salt });

      const secrets = [
        {
          key: "key1",
          value: "value1",
        },
        {
          key: "key2",
          value: "value2",
        },
      ];

      for (const secret of secrets) {
        keystoreFile = addSecretToKeystore({
          masterKey,
          encryptedKeystore: keystoreFile,
          key: secret.key,
          value: secret.value,
        });
      }

      await writeJsonFile(configurationVariableKeystoreFilePath, keystoreFile);

      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(
            configurationVariableKeystoreFilePath,
          ),
          setupKeystorePassword([TEST_PASSWORD]),
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
            createEmptyEncryptedKeystore(
              createMasterKey({
                password: "random-password",
              }),
            ),
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
