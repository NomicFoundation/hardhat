import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("hardhat-solx integration", () => {
  const projectFolder = "simple";

  useFixtureProject(projectFolder);

  it("resolves solx config through the HRE", async () => {
    const baseHhConfig = (
      await import(`./fixture-projects/${projectFolder}/hardhat.config.js`)
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    // Verify the solx config was resolved correctly
    assert.equal(hre.config.solx.version, "0.1.3");
    assert.deepEqual(hre.config.solx.settings, {});
  });

  it("resolves solx config with defaults when not specified", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.28",
      plugins: [(await import("../src/index.js")).default],
    });

    // Verify defaults are applied
    assert.equal(hre.config.solx.version, "0.1.3");
    assert.deepEqual(hre.config.solx.settings, {});
  });

  it("preserves type: 'solx' on compiler config entries", async () => {
    const baseHhConfig = (
      await import(`./fixture-projects/${projectFolder}/hardhat.config.js`)
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    // The compiler entry with type: "solx" should be preserved
    const defaultProfile = hre.config.solidity.profiles.default;
    assert.ok(defaultProfile !== undefined, "default profile should exist");
    assert.ok(
      defaultProfile.compilers.length > 0,
      "should have at least one compiler",
    );
    assert.equal(
      defaultProfile.compilers[0].type,
      "solx",
      "compiler type should be 'solx'",
    );
  });

  it("includes 'test' build profile in resolved config", async () => {
    const baseHhConfig = (
      await import(`./fixture-projects/${projectFolder}/hardhat.config.js`)
    ).default;
    const hre = await createHardhatRuntimeEnvironment(baseHhConfig);

    // The "test" build profile should exist (created by plugin's extendUserConfig)
    const profileNames = Object.keys(hre.config.solidity.profiles);
    assert.ok(
      profileNames.includes("test"),
      `Expected "test" profile in: ${profileNames.join(", ")}`,
    );
  });
});
