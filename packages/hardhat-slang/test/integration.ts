import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

describe("hardhat-slang integration", () => {
  useFixtureProject("simple");

  async function createHre() {
    const configPath = await resolveHardhatConfigPath();
    const userConfig = await importUserConfig(configPath);
    return await createHardhatRuntimeEnvironment(userConfig);
  }

  it("resolves plugin config through the HRE", async () => {
    const hre = await createHre();
    assert.equal(hre.config.slang.dangerouslyAllowSlangInProduction, false);
    assert.equal(hre.config.slang.version, "0.1.0-pre.2026-10-01");
  });

  it("resolves plugin config with defaults when not specified", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      solidity: {
        profiles: {
          default: {
            version: "0.8.34",
          },
          slang: {
            type: "slang",
            version: "0.8.34",
          },
        },
      },
      slang: { version: "0.1.0-pre.2026-10-01" },
      plugins: [(await import("../src/index.js")).default],
    });

    assert.equal(hre.config.slang.dangerouslyAllowSlangInProduction, false);
  });

  it("coexists with hardhat-slang-solx in the same config", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      solidity: {
        profiles: {
          default: {
            version: "0.8.34",
          },
          slang: {
            type: "slang",
            version: "0.8.34",
          },
          "slang-solx": {
            type: "slang-solx",
            version: "0.8.34",
          },
        },
      },
      slang: { version: "0.1.0-pre.2026-10-01" },
      plugins: [
        (await import("../src/index.js")).default,
        (await import("@nomicfoundation/hardhat-slang-solx")).default,
      ],
    });

    assert.deepEqual(
      [...hre.config.solidity.registeredCompilerTypes].sort(),
      ["slang", "slang-solx", "solc"],
      "both plugins register their compiler type",
    );
    assert.equal(hre.config.slang.version, "0.1.0-pre.2026-10-01");
    assert.equal(
      hre.config["slang-solx"].dangerouslyAllowSlangSolxInProduction,
      false,
    );
    assert.equal(hre.config.solidity.profiles.slang.compilers[0].type, "slang");
    assert.equal(
      hre.config.solidity.profiles["slang-solx"].compilers[0].type,
      "slang-solx",
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

  it("includes 'slang' build profile in resolved config", async () => {
    const hre = await createHre();

    const profileNames = Object.keys(hre.config.solidity.profiles);
    assert.ok(
      profileNames.includes("slang"),
      `Expected "slang" profile in: ${profileNames.join(", ")}`,
    );

    const slangProfile = hre.config.solidity.profiles.slang;
    assert.equal(
      slangProfile.compilers[0].type,
      "slang",
      "slang profile compiler should have type: 'slang'",
    );
  });

  it("registers 'slang' as a compiler type", async () => {
    const hre = await createHre();

    assert.deepEqual(
      hre.config.solidity.registeredCompilerTypes,
      ["solc", "slang"],
      "the plugin registers 'slang' and leaves core's 'solc' in place, and registers nothing else",
    );
  });
});
