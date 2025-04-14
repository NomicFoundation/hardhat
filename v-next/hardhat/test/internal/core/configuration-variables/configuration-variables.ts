import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  FixedValueConfigurationVariable,
  LazyResolvedConfigurationVariable,
} from "../../../../src/internal/core/configuration-variables.js";
import { HardhatRuntimeEnvironmentImplementation } from "../../../../src/internal/core/hre.js";

describe("ResolvedConfigurationVariable", () => {
  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});
  });

  it("should return the value of a string variable", async () => {
    const variable = new FixedValueConfigurationVariable("foo");

    assert.equal(await variable.get(), "foo");
  });

  it("should return the value of a configuration variable from an environment variable", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should throw if the environment variable is not found", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    await assertRejectsWithHardhatError(
      variable.get(),
      HardhatError.ERRORS.CORE.GENERAL.ENV_VAR_NOT_FOUND,
      { name: variable.name },
    );
  });

  it("should return the cached value if called multiple times", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    process.env.foo = "baz";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should return the value of a configuration variable as a URL", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "http://localhost:8545";

    assert.equal(await variable.getUrl(), "http://localhost:8545");

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid URL", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "not a url";

    await assertRejectsWithHardhatError(
      variable.getUrl(),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_URL,
      {
        url: "not a url",
      },
    );

    delete process.env.foo;
  });

  it("should return the value of a configuration variable as a BigInt", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "42";

    assert.equal(await variable.getBigInt(), 42n);

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid BigInt", async () => {
    const variable = new LazyResolvedConfigurationVariable(hre.hooks, {
      name: "foo",
      _type: "ConfigurationVariable",
    });

    process.env.foo = "not a bigint";

    await assertRejectsWithHardhatError(
      variable.getBigInt(),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_BIGINT,
      {
        value: "not a bigint",
      },
    );

    delete process.env.foo;
  });

  it("Should throw if the configuration variable is not a valid hex string", async () => {
    const variable = new FixedValueConfigurationVariable("not a hex string");

    await assertRejectsWithHardhatError(
      variable.getHexString(),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
      {
        value: "not a hex string",
      },
    );
  });
});
