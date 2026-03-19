import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

describe("hardhat-solx integration", () => {
  useFixtureProject("simple");

  async function createHre() {
    const configPath = await resolveHardhatConfigPath();
    const userConfig = await importUserConfig(configPath);
    return createHardhatRuntimeEnvironment(userConfig);
  }

  it("resolves plugin config through the HRE", async () => {
    const hre = await createHre();
    assert.equal(hre.config.solx.dangerouslyAllowSolxInProduction, false);
  });

  it("resolves plugin config with defaults when not specified", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.33",
      plugins: [(await import("../src/index.js")).default],
    });

    assert.equal(hre.config.solx.dangerouslyAllowSolxInProduction, false);
  });

  it("default profile compilers use solc (no type or 'solc')", async () => {
    const hre = await createHre();

    const defaultProfile = hre.config.solidity.profiles.default;
    assert.ok(defaultProfile !== undefined, "default profile should exist");
    assert.ok(
      defaultProfile.compilers.length > 0,
      "should have at least one compiler",
    );
    // Default profile should keep solc (no type override from plugin)
    const compilerType = defaultProfile.compilers[0].type;
    assert.ok(
      compilerType === undefined || compilerType === "solc",
      `default profile compiler type should be solc, got: ${compilerType}`,
    );
  });

  it("includes 'test' build profile in resolved config", async () => {
    const hre = await createHre();

    const profileNames = Object.keys(hre.config.solidity.profiles);
    assert.ok(
      profileNames.includes("test"),
      `Expected "test" profile in: ${profileNames.join(", ")}`,
    );

    const testProfile = hre.config.solidity.profiles.test;
    assert.equal(
      testProfile.compilers[0].type,
      "solx",
      "test profile compiler should have type: 'solx'",
    );
  });

  it("registers 'solx' as a compiler type", async () => {
    const hre = await createHre();

    assert.ok(
      hre.config.solidity.registeredCompilerTypes.includes("solx"),
      "registeredCompilerTypes should include 'solx'",
    );
  });
});
