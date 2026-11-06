import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTestEnvManager,
} from "@nomicfoundation/hardhat-test-utils";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { configVariable } from "../../../../../src/config.js";
import { getPrivateKey } from "../../../../../src/internal/builtin-plugins/network-manager/accounts/get-private-key.js";
import {
  FixedValueConfigurationVariable,
  LazyResolvedConfigurationVariable,
} from "../../../../../src/internal/core/configuration-variables.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

const SECP256K1_ORDER =
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141";

describe("getPrivateKey", () => {
  const { setEnvVar } = createTestEnvManager();
  const privateKey = `0x${"ab".repeat(32)}`;
  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
  });

  it("should return the private key, normalized like getHexString does", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    setEnvVar("foo", ` ${"AB".repeat(32)} `);

    assert.equal(await getPrivateKey(variable), privateKey);
  });

  for (const value of ["", "0x1234", `0x${"ab".repeat(33)}`]) {
    it(`should throw if the private key isn't 32 bytes long (${JSON.stringify(value)})`, async () => {
      const variable = new LazyResolvedConfigurationVariable(
        hre.hooks,
        configVariable("foo"),
      );

      setEnvVar("foo", value);

      await assertRejectsWithHardhatError(
        getPrivateKey(variable),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_PRIVATE_KEY,
        {
          configVariable: `the configuration variable "foo"`,
        },
      );
    });
  }

  for (const value of [`0x${"00".repeat(32)}`, SECP256K1_ORDER]) {
    it(`should throw if the private key is out of the secp256k1 range (${JSON.stringify(value)})`, async () => {
      const variable = new LazyResolvedConfigurationVariable(
        hre.hooks,
        configVariable("foo"),
      );

      setEnvVar("foo", value);

      await assertRejectsWithHardhatError(
        getPrivateKey(variable),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_PRIVATE_KEY,
        {
          configVariable: `the configuration variable "foo"`,
        },
      );
    });
  }

  it("should throw if the private key is not a valid hex string", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    setEnvVar("foo", "0xzz");

    await assertRejectsWithHardhatError(
      getPrivateKey(variable),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_HEX_STRING,
      {
        configVariable: `the configuration variable "foo"`,
      },
    );
  });

  it("should not include the private key in its errors", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    setEnvVar("foo", "0x1234");

    let thrownError: Error | undefined;

    try {
      await getPrivateKey(variable);
    } catch (error) {
      ensureError(error);
      thrownError = error;
    }

    assert.ok(thrownError !== undefined, "getPrivateKey should have thrown");
    assert.ok(
      !thrownError.message.includes("1234"),
      `The error message must not include the value, but it was: ${thrownError.message}`,
    );
  });

  for (const value of ["0x1234", `0x${"00".repeat(32)}`]) {
    it(`should throw if an inline private key is invalid (${JSON.stringify(value)})`, async () => {
      const variable = new FixedValueConfigurationVariable(value);

      await assertRejectsWithHardhatError(
        getPrivateKey(variable),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_PRIVATE_KEY,
        {
          configVariable: "an inline configuration value",
        },
      );
    });
  }
});
