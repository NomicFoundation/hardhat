import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import { configVariable } from "../../../../src/config.js";
import {
  CONFIGURATION_VARIABLE_MARKER,
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

  it("should return the value of a configuration variable from an environment variable, without format", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should return the value of a configuration variable from an environment variable, with format", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo", `variable: ${CONFIGURATION_VARIABLE_MARKER}`),
    );

    process.env.foo = "bar";

    assert.equal(await variable.get(), "variable: bar");

    delete process.env.foo;
  });

  it("should throw if the environment variable is not found", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    await assertRejectsWithHardhatError(
      variable.get(),
      HardhatError.ERRORS.CORE.GENERAL.ENV_VAR_NOT_FOUND,
      { name: variable.name },
    );
  });

  it("should return the default value when the environment variable is not set", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("DEFAULT_TEST_UNSET", { default: "the-default" }),
    );

    assert.equal(await variable.get(), "the-default");
  });

  it("should prefer the environment variable over the default value", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("DEFAULT_TEST_ENV", { default: "the-default" }),
    );

    process.env.DEFAULT_TEST_ENV = "from-env";

    assert.equal(await variable.get(), "from-env");

    delete process.env.DEFAULT_TEST_ENV;
  });

  it("should prefer an empty-string environment variable over the default value", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("DEFAULT_TEST_EMPTY", { default: "the-default" }),
    );

    process.env.DEFAULT_TEST_EMPTY = "";

    assert.equal(await variable.get(), "");

    delete process.env.DEFAULT_TEST_EMPTY;
  });

  it("should apply the format to the default value", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("DEFAULT_TEST_FORMAT", {
        format: `variable: ${CONFIGURATION_VARIABLE_MARKER}`,
        default: "the-default",
      }),
    );

    assert.equal(await variable.get(), "variable: the-default");
  });

  it("should return the cached value if called multiple times", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    process.env.foo = "baz";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should return the value of a configuration variable as a URL", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    process.env.foo = "http://localhost:8545";

    assert.equal(await variable.getUrl(), "http://localhost:8545");

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid URL", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

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
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

    process.env.foo = "42";

    assert.equal(await variable.getBigInt(), 42n);

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid BigInt", async () => {
    const variable = new LazyResolvedConfigurationVariable(
      hre.hooks,
      configVariable("foo"),
    );

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

describe("configVariable", function () {
  it("should return a configuration variable, when passing only name", async () => {
    const variable = configVariable("foo");

    assert.equal(variable.name, "foo");
    assert.equal(variable._type, "ConfigurationVariable");
    assert.equal(variable.format, CONFIGURATION_VARIABLE_MARKER);
  });

  it("should return a configuration variable, when passing name and format", async () => {
    const variable = configVariable("foo", "var: {variable}");

    assert.equal(variable.name, "foo");
    assert.equal(variable._type, "ConfigurationVariable");
    assert.equal(variable.format, "var: {variable}");
  });

  it("should not set a default value when none is provided", async () => {
    assert.equal(configVariable("foo").default, undefined);
    assert.equal(configVariable("foo", "var: {variable}").default, undefined);
  });

  it("should return a configuration variable with a default value", async () => {
    const variable = configVariable("foo", { default: "bar" });

    assert.equal(variable.name, "foo");
    assert.equal(variable._type, "ConfigurationVariable");
    assert.equal(variable.format, CONFIGURATION_VARIABLE_MARKER);
    assert.equal(variable.default, "bar");
  });

  it("should return a configuration variable with a format and a default value", async () => {
    const variable = configVariable("foo", {
      format: "var: {variable}",
      default: "bar",
    });

    assert.equal(variable.name, "foo");
    assert.equal(variable._type, "ConfigurationVariable");
    assert.equal(variable.format, "var: {variable}");
    assert.equal(variable.default, "bar");
  });

  it("throws an error when format doesn't include the variable marker", async () => {
    assertThrowsHardhatError(
      () => {
        configVariable("foo", "missing_marker");
      },
      HardhatError.ERRORS.CORE.GENERAL
        .CONFIG_VARIABLE_FORMAT_MUST_INCLUDE_VARIABLE,
      { format: "missing_marker", marker: "{variable}" },
    );
  });

  it("throws an error when the format in the options object doesn't include the variable marker", async () => {
    assertThrowsHardhatError(
      () => {
        configVariable("foo", { format: "missing_marker" });
      },
      HardhatError.ERRORS.CORE.GENERAL
        .CONFIG_VARIABLE_FORMAT_MUST_INCLUDE_VARIABLE,
      { format: "missing_marker", marker: "{variable}" },
    );
  });
});
