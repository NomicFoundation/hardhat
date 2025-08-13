import type { ConfigurationVariable } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

// NOTE: we are importing using the default export, running the CI determination
// code. On CI this will be the reduced plugin, in local development this will
// be the full plugin.
import hardhatKeystorePlugin from "../../src/index.js";
import { setupKeystorePassword } from "../helpers/insert-password-hook.js";
import { setupKeystoreFileLocationOverrideAt } from "../helpers/setup-keystore-file-location-override-at.js";
import { TEST_PASSWORD_PROD } from "../helpers/test-password.js";

// The keystore json file for this test has been created using the following configuration:
// Test password: the one contained in the variable `TEST_PASSWORD_PROD`
// Secret key name: key1
// Secret value: secret

const basePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
);

const existingKeystoreFilePath = path.join(basePath, "existing-keystore.json");
const existingKeystoreDevFilePath = path.join(
  fileURLToPath(import.meta.url),
  basePath,
  "existing-keystore-dev.json",
);
const existingKeystoreDevPasswordFilePath = path.join(
  basePath,
  "fake-keystore-hardhat.checksum-path-ci",
);

/**
 * This test checks that the Keystore plugin is "disabled" when running in a CI environment.
 *
 * This of course gets complicated because we are running the test in our CI to check
 * that the plugin is disabled in CI.
 *
 * The approach taken is to import the plugin directly from `./src/index.ts` loading via
 * the CI choosing logic of the default export. Then the test does a Hook lookup for a
 * configuration variable. We switch the asserted expected value depending on whether
 * we are in CI or not. This test works both in CI and locally and tests the CI detection
 * logic.
 */
describe("turn off keystore plugin when running in CI", function () {
  let hre: HardhatRuntimeEnvironment;
  let resultValue: string;

  beforeEach(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [
        hardhatKeystorePlugin,
        setupKeystoreFileLocationOverrideAt(
          existingKeystoreFilePath,
          existingKeystoreDevFilePath,
          existingKeystoreDevPasswordFilePath,
        ),
        setupKeystorePassword([TEST_PASSWORD_PROD]),
      ],
    });

    const exampleConfigurationVariable: ConfigurationVariable = {
      _type: "ConfigurationVariable",
      name: "key1",
    };

    resultValue = await hre.hooks.runHandlerChain(
      "configurationVariables",
      "fetchValue",
      [exampleConfigurationVariable],
      async (_context, _configVar) => {
        return "expected-default-value-in-ci";
      },
    );
  });

  it("return read from the keystore in development and return the default value in CI", async function () {
    if (isCi()) {
      assert.equal(resultValue, "expected-default-value-in-ci");
    } else {
      assert.equal(resultValue, "secret");
    }
  });
});
