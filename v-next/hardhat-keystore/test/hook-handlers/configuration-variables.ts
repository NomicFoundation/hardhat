import type { ConfigurationVariable } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import {
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatKeystorePlugin from "../../src/index.js";
import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
} from "../../src/internal/keystores/encryption.js";
import { setupKeystorePassword } from "../helpers/insert-password-hook.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import {
  TEST_PASSWORD_DEV,
  TEST_PASSWORD_PROD,
} from "../helpers/test-password.js";

const basePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
);

const configurationVariableProdKeystoreFilePath = path.join(
  basePath,
  "config-variables-keystore.json",
);

const configurationVariableDevKeystoreFilePath = path.join(
  basePath,
  "config-variables-dev-keystore.json",
);

const configurationVariableDevKeystorePasswordFilePath = path.join(
  basePath,
  "fake-keystore-hardhat.checksum-path-config-var",
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

const exampleConfigurationVariable2: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key3-dev",
};

const exampleConfigurationVariable3: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key3-prod",
};

const exampleConfigurationVariable4: ConfigurationVariable = {
  _type: "ConfigurationVariable",
  name: "key4-prod",
};

describe("hook-handlers - configuration variables - fetchValue", () => {
  let hre: HardhatRuntimeEnvironment;
  let runningInCi: boolean;

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

  describe("when there are existing development and production valid keystore files", () => {
    beforeEach(async () => {
      //
      // Prod keystore setup
      //
      await remove(configurationVariableProdKeystoreFilePath);

      const { masterKey: masterKeyProd, salt: saltProd } = createMasterKey({
        password: TEST_PASSWORD_PROD,
      });

      let keystoreFileProd = createEmptyEncryptedKeystore({
        masterKey: masterKeyProd,
        salt: saltProd,
      });

      const secretsProd = [
        // Key1 and Key2 are the same in both keystores
        {
          key: "key1",
          value: "value1-prod",
        },
        {
          key: "key2",
          value: "value2-prod",
        },
        {
          key: "key3-prod",
          value: "value3-prod",
        },
        {
          key: "key4-prod",
          value: "value4-prod",
        },
      ];

      for (const secret of secretsProd) {
        keystoreFileProd = addSecretToKeystore({
          masterKey: masterKeyProd,
          encryptedKeystore: keystoreFileProd,
          key: secret.key,
          value: secret.value,
        });
      }

      await writeJsonFile(
        configurationVariableProdKeystoreFilePath,
        keystoreFileProd,
      );

      //
      // Dev Keystore setup
      //
      await remove(configurationVariableDevKeystorePasswordFilePath);

      const { masterKey: masterKeyDev, salt: saltDev } = createMasterKey({
        password: TEST_PASSWORD_DEV,
      });

      let keystoreFileDev = createEmptyEncryptedKeystore({
        masterKey: masterKeyDev,
        salt: saltDev,
      });

      await writeUtf8File(
        configurationVariableDevKeystorePasswordFilePath,
        TEST_PASSWORD_DEV,
      );

      const secretsDev = [
        // Key1 and Key2 are the same in both keystores
        {
          key: "key1",
          value: "value1-dev",
        },
        {
          key: "key2",
          value: "value2-dev",
        },
        {
          key: "key3-dev",
          value: "value3-dev",
        },
        {
          key: "key4-dev",
          value: "value4-dev",
        },
      ];

      for (const secret of secretsDev) {
        keystoreFileDev = addSecretToKeystore({
          masterKey: masterKeyDev,
          encryptedKeystore: keystoreFileDev,
          key: secret.key,
          value: secret.value,
        });
      }

      await writeJsonFile(
        configurationVariableDevKeystoreFilePath,
        keystoreFileDev,
      );

      hre = await createHardhatRuntimeEnvironment({
        plugins: [
          hardhatKeystorePlugin,
          setupKeystoreFileLocationOverrideAt(
            configurationVariableProdKeystoreFilePath,
            configurationVariableDevKeystoreFilePath,
            configurationVariableDevKeystorePasswordFilePath,
          ),
          setupKeystorePassword([TEST_PASSWORD_PROD]),
        ],
      });
    });

    afterEach(async () => {
      await remove(configurationVariableProdKeystoreFilePath);
      await remove(configurationVariableDevKeystoreFilePath);
      await remove(configurationVariableDevKeystorePasswordFilePath);
    });

    describe("successful get keys in the keystore", () => {
      // The password should be requested only once since the masterKey is cached
      let results: string[];

      beforeEach(async () => {
        results = [
          // This one gets the value from the development keystore, even if it exists in the production keystore too
          await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [exampleConfigurationVariable],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          ),
          // This one gets the value from the development keystore, because it doesn't exist in the production keystore
          await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [exampleConfigurationVariable2],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          ),
          // This one gets the value from the production keystore, because it doesn't exist in the development keystore
          await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [exampleConfigurationVariable3],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          ),
          // This one gets the value from the production keystore, because it doesn't exist in the development keystore
          // and it should not ask for the password again as it was provided in the previous fetch
          await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [exampleConfigurationVariable4],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          ),
        ];
      });

      it("should fetch the value for the key in the keystore", async () => {
        assert.equal(results[0], "value1-dev");
        assert.equal(results[1], "value3-dev");
        assert.equal(results[2], "value3-prod");
        assert.equal(results[3], "value4-prod");
      });
    });

    describe("when the keystore is in test mode", () => {
      before(() => {
        process.env.HH_TEST = "true";
      });

      after(() => {
        process.env.HH_TEST = undefined;
      });

      it("should not throw an error if the keystore is executed in test mode and the key is in the development keystore", async () => {
        const res = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [exampleConfigurationVariable2],
          async (_context, _configVar) => {
            return "unexpected-default-value";
          },
        );

        assert.equal(res, "value3-dev");
      });

      it("should throw an error if the keystore is executed in test mode and the key is not in the development keystore", async () => {
        await assertRejectsWithHardhatError(
          () =>
            hre.hooks.runHandlerChain(
              "configurationVariables",
              "fetchValue",
              [exampleConfigurationVariable3],
              async (_context, _configVar) => {
                return "unexpected-default-value";
              },
            ),
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL
            .KEY_NOT_FOUND_DURING_TESTS_WITH_DEV_KEYSTORE,
          { key: "key3-prod" },
        );
      });

      it("should throw an error if the keystore is executed in test mode and the development keystore does not exists", async () => {
        // Delete the development keystore to simulate it not existing
        await remove(configurationVariableDevKeystoreFilePath);

        await assertRejectsWithHardhatError(
          () =>
            hre.hooks.runHandlerChain(
              "configurationVariables",
              "fetchValue",
              [exampleConfigurationVariable3],
              async (_context, _configVar) => {
                return "unexpected-default-value";
              },
            ),
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL
            .KEY_NOT_FOUND_DURING_TESTS_WITH_DEV_KEYSTORE,
          { key: "key3-prod" },
        );
      });
    });

    describe("where the key is not in the development and production keystore", () => {
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
        let resultValueProd2: string;
        let resultValueDev2: string;

        beforeEach(async () => {
          const resultValueProd = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key3-prod" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );

          assert.equal(resultValueProd, "value3-prod");

          const resultValueDev = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key3-dev" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );

          assert.equal(resultValueDev, "value3-dev");

          // After the initial read, overwrite the keystore file with
          // empty keys to ensure the cache is being used
          await writeJsonFile(
            configurationVariableProdKeystoreFilePath,
            createEmptyEncryptedKeystore(
              createMasterKey({
                password: "random-password",
              }),
            ),
          );

          await writeJsonFile(
            configurationVariableDevKeystoreFilePath,
            createEmptyEncryptedKeystore(
              createMasterKey({
                password: "random-password",
              }),
            ),
          );

          resultValueProd2 = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key3-prod" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );

          resultValueDev2 = await hre.hooks.runHandlerChain(
            "configurationVariables",
            "fetchValue",
            [{ ...exampleConfigurationVariable, name: "key3-dev" }],
            async (_context, _configVar) => {
              return "unexpected-default-value";
            },
          );
        });

        it("should successfully get a key on", async () => {
          assert.equal(resultValueProd2, "value3-prod");
          assert.equal(resultValueDev2, "value3-dev");
        });
      });
    });
  });

  describe("when the keystore file has not been setup", () => {
    describe("when trying to get a value not in the tests", () => {
      let resultValueProd: string;
      let resultValueDev: string;

      beforeEach(async () => {
        hre = await createHardhatRuntimeEnvironment({
          plugins: [
            hardhatKeystorePlugin,
            setupKeystoreFileLocationOverrideAt(
              nonExistingKeystoreFilePath,
              nonExistingKeystoreFilePath,
              configurationVariableDevKeystorePasswordFilePath,
            ),
          ],
        });

        resultValueProd = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [{ ...exampleConfigurationVariable, name: "key3-prod" }],
          async (_context, _configVar) => {
            return "value-from-hardhat-package";
          },
        );

        resultValueDev = await hre.hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [{ ...exampleConfigurationVariable, name: "key3-dev" }],
          async (_context, _configVar) => {
            return "value-from-hardhat-package";
          },
        );
      });

      it("should invoke the next function and return its value because no keystore is found", async () => {
        assert.equal(resultValueProd, "value-from-hardhat-package");
        assert.equal(resultValueDev, "value-from-hardhat-package");
      });
    });
  });
});
