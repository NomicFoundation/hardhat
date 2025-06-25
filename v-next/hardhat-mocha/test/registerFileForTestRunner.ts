import type { HardhatUserConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("registerFileForTestRunner hook", function () {
  let hre: HardhatRuntimeEnvironment;
  let baseHhConfig: HardhatUserConfig;

  useFixtureProject("test-project");

  before(async () => {
    baseHhConfig = (
      await import("./fixture-projects/test-project/hardhat.config.js")
    ).default;
  });

  it("is not mocha when the file ends with .sol", async () => {
    hre = await createHardhatRuntimeEnvironment({
      ...baseHhConfig,
      paths: { tests: { mocha: "test" } },
    });

    const result = await hre.hooks.runHandlerChain(
      "test",
      "registerFileForTestRunner",
      [path.join(hre.config.paths.root, "test/test.sol")],
      async () => undefined,
    );

    assert.notEqual(result, "mocha");
  });

  it("is mocha when the file is inside the mocha test folder", async () => {
    hre = await createHardhatRuntimeEnvironment({
      ...baseHhConfig,
      paths: { tests: { mocha: "test" } },
    });

    const result = await hre.hooks.runHandlerChain(
      "test",
      "registerFileForTestRunner",
      [path.join(hre.config.paths.root, "test/test.ts")],
      async () => undefined,
    );

    assert.equal(result, "mocha");
  });

  it("is mocha when the file is not inside other runners directories", async () => {
    hre = await createHardhatRuntimeEnvironment({
      ...baseHhConfig,
      paths: { tests: { mocha: "test" } },
    });

    const result = await hre.hooks.runHandlerChain(
      "test",
      "registerFileForTestRunner",
      [path.join(hre.config.paths.root, "contracts/test.ts")],
      async () => undefined,
    );

    assert.equal(result, "mocha");
  });

  it("is not mocha when the file is inside other runners directories", async () => {
    hre = await createHardhatRuntimeEnvironment({
      ...baseHhConfig,
      paths: { tests: { mocha: "test", solidity: "contracts" } },
    });

    const result = await hre.hooks.runHandlerChain(
      "test",
      "registerFileForTestRunner",
      [path.join(hre.config.paths.root, "contracts/test.ts")],
      async () => undefined,
    );

    assert.notEqual(result, "mocha");
  });
});
