import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatKeystorePlugin from "../../src/index.js";

const CONFIG_VAR_KEY = "configVarKey";

describe.skip("hook", () => {
  let hre: HardhatRuntimeEnvironment;
  // let originalHasKeystore: () => Promise<boolean>;
  // let originalLoadOrInit: () => Promise<Keystore>;

  before(async () => {
    // originalHasKeystore = UnencryptedKeystoreLoader.prototype.hasKeystore;
    // originalLoadOrInit = UnencryptedKeystoreLoader.prototype.loadOrInit;

    hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatKeystorePlugin],
    });
  });

  afterEach(async () => {
    // UnencryptedKeystoreLoader.prototype.hasKeystore = originalHasKeystore;
    // UnencryptedKeystoreLoader.prototype.loadOrInit = originalLoadOrInit;
  });

  it("should invoke the keystore and return the value from it", async () => {
    // Mock expected values
    // UnencryptedKeystoreLoader.prototype.hasKeystore = async function () {
    //   return true;
    // };
    // UnencryptedKeystoreLoader.prototype.loadOrInit = async function () {
    //   return new UnencryptedKeystore(
    //     {
    //       version: "",
    //       keys: {
    //         [CONFIG_VAR_KEY]: "value",
    //       },
    //     },
    //     "test-path",
    //   );
    // };

    // Configure and run the hook
    const configVar: ConfigurationVariable = {
      _type: "ConfigurationVariable",
      name: CONFIG_VAR_KEY,
    };

    const resultValue = await hre.hooks.runHandlerChain(
      "configurationVariables",
      "fetchValue",
      [configVar],
      async (_context, _configVar) => {
        return "";
      },
    );

    assert.equal(resultValue, "value");
  });

  it("should invoke the next function because no keystore is found", async () => {
    // Mock expected values
    // UnencryptedKeystoreLoader.prototype.hasKeystore = async function () {
    //   return false;
    // };

    // Configure and run the hook
    const configVar: ConfigurationVariable = {
      _type: "ConfigurationVariable",
      name: CONFIG_VAR_KEY,
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

  it("should invoke the next function because the keystore is found but the key is not present", async () => {
    // Mock expected values
    // UnencryptedKeystoreLoader.prototype.hasKeystore = async function () {
    //   return true;
    // };
    // UnencryptedKeystoreLoader.prototype.loadOrInit = async function () {
    //   return new UnencryptedKeystore(
    //     {
    //       version: "",
    //       keys: {},
    //     },
    //     "test-path",
    //   );
    // };

    // Configure and run the hook
    const configVar: ConfigurationVariable = {
      _type: "ConfigurationVariable",
      name: CONFIG_VAR_KEY,
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
