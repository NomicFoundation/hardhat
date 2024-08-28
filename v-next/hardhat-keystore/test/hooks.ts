import type { ConfigurationVariable } from "@ignored/hardhat-vnext/types/config";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatKeystorePlugin from "../src/index.js";
import { setKeystoreCache } from "../src/utils.js";

import { createKeyStore, deleteKeystore } from "./helpers.js";

const CONFIG_VAR_KEY = "configVarKey";

describe("hook", () => {
  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatKeystorePlugin],
    });
  });

  beforeEach(async () => {
    // Simulate a new use of the plugin every time a test is run
    setKeystoreCache(undefined);
    await deleteKeystore();
  });

  afterEach(async () => {
    await deleteKeystore();
  });

  it("should invoke the keystore and return the value from it", async () => {
    await createKeyStore([[CONFIG_VAR_KEY, "value"]]);
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
    await createKeyStore([["key", "value"]]);
    const configVar: ConfigurationVariable = {
      _type: "ConfigurationVariable",
      name: "missing-key",
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
