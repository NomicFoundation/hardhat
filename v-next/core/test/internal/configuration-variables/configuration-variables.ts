import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { findClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { ResolvedConfigurationVariableImplementation } from "../../../src/internal/configuration-variables.js";
import { HookManagerImplementation } from "../../../src/internal/hook-manager.js";
import { UserInterruptionManagerImplementation } from "../../../src/internal/user-interruptions.js";

describe("ResolvedConfigurationVariable", () => {
  let hookManager: HookManagerImplementation;

  before(async () => {
    const projectRoot = path.dirname(
      await findClosestPackageJson(process.cwd()),
    );

    hookManager = new HookManagerImplementation(projectRoot, []);
    const userInterruptionsManager = new UserInterruptionManagerImplementation(
      hookManager,
    );

    hookManager.setContext({
      config: {
        tasks: [],
        plugins: [],
      },
      hooks: hookManager,
      globalOptions: {},
      interruptions: userInterruptionsManager,
    });
  });

  it("should return the value of a string variable", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      "foo",
    );

    assert.equal(await variable.get(), "foo");
  });

  it("should return the value of a configuration variable from an environment variable", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should throw if the environment variable is not found", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    await assertRejectsWithHardhatError(
      variable.get(),
      HardhatError.ERRORS.GENERAL.ENV_VAR_NOT_FOUND,
      {},
    );
  });

  it("should return the cached value if called multiple times", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "bar";

    assert.equal(await variable.get(), "bar");

    process.env.foo = "baz";

    assert.equal(await variable.get(), "bar");

    delete process.env.foo;
  });

  it("should return the value of a configuration variable as a URL", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "http://localhost:8545";

    assert.equal(await variable.getUrl(), "http://localhost:8545");

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid URL", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "not a url";

    await assertRejectsWithHardhatError(
      variable.getUrl(),
      HardhatError.ERRORS.GENERAL.INVALID_URL,
      {
        url: "not a url",
      },
    );

    delete process.env.foo;
  });

  it("should return the value of a configuration variable as a BigInt", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "42";

    assert.equal(await variable.getBigInt(), 42n);

    delete process.env.foo;
  });

  it("should throw if the configuration variable is not a valid BigInt", async () => {
    const variable = new ResolvedConfigurationVariableImplementation(
      hookManager,
      { name: "foo", _type: "ConfigurationVariable" },
    );

    process.env.foo = "not a bigint";

    await assertRejectsWithHardhatError(
      variable.getBigInt(),
      HardhatError.ERRORS.GENERAL.INVALID_BIGINT,
      {
        value: "not a bigint",
      },
    );

    delete process.env.foo;
  });
});
