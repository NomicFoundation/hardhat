import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

describe("hardhat-slang-solx integration", () => {
  useFixtureProject("simple");

  async function createHre() {
    const configPath = await resolveHardhatConfigPath();
    const userConfig = await importUserConfig(configPath);
    return await createHardhatRuntimeEnvironment(userConfig);
  }

  it("resolves plugin config through the HRE", async () => {
    const hre = await createHre();
    assert.equal(
      hre.config.slangSolx.dangerouslyAllowSlangSolxInProduction,
      false,
    );
  });

  it("resolves plugin config with defaults when not specified", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      solidity: {
        profiles: {
          default: {
            version: "0.8.34",
          },
          "slang-solx": {
            type: "slang-solx",
            version: "0.8.34",
          },
        },
      },
      plugins: [(await import("../src/index.js")).default],
    });

    assert.equal(
      hre.config.slangSolx.dangerouslyAllowSlangSolxInProduction,
      false,
    );
  });

  it("default profile compilers use solc (no type or 'solc')", async () => {
    const hre = await createHre();

    const defaultProfile = hre.config.solidity.profiles.default;
    assert.ok(defaultProfile !== undefined, "default profile should exist");
    assert.ok(
      defaultProfile.compilers.length > 0,
      "should have at least one compiler",
    );
    const compilerType = defaultProfile.compilers[0].type;
    assert.ok(
      compilerType === undefined || compilerType === "solc",
      `default profile compiler type should be solc, got: ${compilerType}`,
    );
  });

  it("includes 'slang-solx' build profile in resolved config", async () => {
    const hre = await createHre();

    const profileNames = Object.keys(hre.config.solidity.profiles);
    assert.ok(
      profileNames.includes("slang-solx"),
      `Expected "slang-solx" profile in: ${profileNames.join(", ")}`,
    );

    const slangSolxProfile = hre.config.solidity.profiles["slang-solx"];
    assert.equal(
      slangSolxProfile.compilers[0].type,
      "solx",
      "the resolved compiler carries the name EDR reads from the build info, not the one the user wrote",
    );
  });

  it("registers 'slang-solx' as a compiler type", async () => {
    const hre = await createHre();

    assert.ok(
      hre.config.solidity.registeredCompilerTypes.includes("slang-solx"),
      "registeredCompilerTypes should include 'slang-solx'",
    );
  });
});
