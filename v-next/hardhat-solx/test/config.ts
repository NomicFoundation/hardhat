/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import type { HardhatUserConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extendUserConfig,
  resolveUserConfig,
  validateUserConfig,
} from "../src/internal/hook-handlers/config.js";

describe("hardhat-solx config validation", () => {
  it("accepts valid config with all fields", async () => {
    const errors = await validateUserConfig({
      solx: {
        version: "0.1.3",
        settings: { LLVMOptimization: "1" },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts valid config with only version", async () => {
    const errors = await validateUserConfig({
      solx: {
        version: "0.1.3",
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts empty solx config", async () => {
    const errors = await validateUserConfig({
      solx: {},
    });
    assert.deepEqual(errors, []);
  });

  it("accepts config without solx key", async () => {
    const errors = await validateUserConfig({});
    assert.deepEqual(errors, []);
  });

  it("rejects invalid config shapes", async () => {
    const errors = await validateUserConfig({
      solx: {
        version: 123 as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("rejects invalid settings type", async () => {
    const errors = await validateUserConfig({
      solx: {
        settings: "flag" as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });
});

describe("hardhat-solx config resolution", () => {
  it("resolves with defaults when no solx config provided", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      async (config: any, _resolve: any) => ({ ...config }),
    );

    assert.equal(resolvedConfig.solx.version, "0.1.3");
    assert.deepEqual(resolvedConfig.solx.settings, {});
  });

  it("resolves with defaults when empty solx config provided", async () => {
    const resolvedConfig = await resolveUserConfig(
      { solx: {} },
      undefined as any,
      async (config: any, _resolve: any) => ({ ...config }),
    );

    assert.equal(resolvedConfig.solx.version, "0.1.3");
    assert.deepEqual(resolvedConfig.solx.settings, {});
  });

  it("resolves with user-specified values", async () => {
    const resolvedConfig = await resolveUserConfig(
      {
        solx: {
          version: "0.1.2",
          settings: { LLVMOptimization: "1" },
        },
      },
      undefined as any,
      async (config: any, _resolve: any) => ({ ...config }),
    );

    assert.equal(resolvedConfig.solx.version, "0.1.2");
    assert.deepEqual(resolvedConfig.solx.settings, { LLVMOptimization: "1" });
  });
});

describe("hardhat-solx extendUserConfig — test profile creation", () => {
  const next = async (c: HardhatUserConfig) => c;

  it('creates "test" profile from version string config', async () => {
    const result = await extendUserConfig({ solidity: "0.8.28" }, next);

    const solidity = result.solidity as any;
    assert.ok(
      solidity.profiles !== undefined,
      "should be converted to profiles format",
    );
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );

    // Default profile should be preserved
    assert.equal(solidity.profiles.default.version, "0.8.28");
    assert.equal(
      solidity.profiles.default.type,
      undefined,
      "default should not have type: solx",
    );

    // Test profile compilers should have type: "solx"
    assert.equal(solidity.profiles.test.version, "0.8.28");
    assert.equal(solidity.profiles.test.type, "solx");
  });

  it('creates "test" profile from multi-version array config', async () => {
    const result = await extendUserConfig(
      { solidity: ["0.8.24", "0.8.25"] },
      next,
    );

    const solidity = result.solidity as any;
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );

    // Default profile: array converted to compilers form
    assert.equal(solidity.profiles.default.compilers.length, 2);
    assert.equal(solidity.profiles.default.compilers[0].version, "0.8.24");
    assert.equal(solidity.profiles.default.compilers[0].type, undefined);

    // Test profile: compilers with type: "solx"
    assert.equal(solidity.profiles.test.compilers.length, 2);
    assert.equal(solidity.profiles.test.compilers[0].version, "0.8.24");
    assert.equal(solidity.profiles.test.compilers[0].type, "solx");
    assert.equal(solidity.profiles.test.compilers[1].version, "0.8.25");
    assert.equal(solidity.profiles.test.compilers[1].type, "solx");
  });

  it('creates "test" profile from single version object config', async () => {
    const result = await extendUserConfig(
      {
        solidity: {
          version: "0.8.28",
          settings: { optimizer: { enabled: true, runs: 200 } },
        },
      },
      next,
    );

    const solidity = result.solidity as any;
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );

    // Default profile preserves settings
    assert.equal(solidity.profiles.default.version, "0.8.28");
    assert.deepEqual(solidity.profiles.default.settings, {
      optimizer: { enabled: true, runs: 200 },
    });

    // Test profile: version + type only (settings stripped, like copyFromDefault)
    assert.equal(solidity.profiles.test.version, "0.8.28");
    assert.equal(solidity.profiles.test.type, "solx");
    assert.equal(
      solidity.profiles.test.settings,
      undefined,
      "settings should be stripped from test profile",
    );
  });

  it('creates "test" profile from multi-version object config with overrides', async () => {
    const result = await extendUserConfig(
      {
        solidity: {
          compilers: [{ version: "0.8.24" }, { version: "0.8.25" }],
          overrides: {
            "contracts/Special.sol": { version: "0.8.26" },
          },
        },
      },
      next,
    );

    const solidity = result.solidity as any;
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );

    // Test profile compilers
    assert.equal(solidity.profiles.test.compilers.length, 2);
    assert.equal(solidity.profiles.test.compilers[0].type, "solx");
    assert.equal(solidity.profiles.test.compilers[1].type, "solx");

    // Test profile overrides also get type: "solx"
    assert.equal(
      solidity.profiles.test.overrides["contracts/Special.sol"].version,
      "0.8.26",
    );
    assert.equal(
      solidity.profiles.test.overrides["contracts/Special.sol"].type,
      "solx",
    );
  });

  it('auto-fills missing "test" profile in build profiles config', async () => {
    const result = await extendUserConfig(
      {
        solidity: {
          profiles: {
            default: { version: "0.8.24" },
            production: { version: "0.8.24", isolated: true },
          },
        },
      },
      next,
    );

    const solidity = result.solidity as any;
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );
    assert.equal(solidity.profiles.test.version, "0.8.24");
    assert.equal(solidity.profiles.test.type, "solx");

    // Existing profiles should be preserved
    assert.equal(solidity.profiles.default.version, "0.8.24");
    assert.equal(solidity.profiles.production.isolated, true);
  });

  it('preserves user-defined "test" profile', async () => {
    const result = await extendUserConfig(
      {
        solidity: {
          profiles: {
            default: { version: "0.8.24" },
            test: { version: "0.8.25", isolated: true },
          },
        },
      },
      next,
    );

    const solidity = result.solidity as any;
    // User's test profile should be untouched
    assert.equal(solidity.profiles.test.version, "0.8.25");
    assert.equal(solidity.profiles.test.isolated, true);
    assert.equal(
      solidity.profiles.test.type,
      undefined,
      "should not inject type: solx into user-defined test profile",
    );
  });

  it("preserves npmFilesToBuild when converting to profiles format", async () => {
    const result = await extendUserConfig(
      {
        solidity: {
          version: "0.8.28",
          npmFilesToBuild: ["@openzeppelin/**"],
        },
      },
      next,
    );

    const solidity = result.solidity as any;
    assert.deepEqual(solidity.npmFilesToBuild, ["@openzeppelin/**"]);
    assert.ok(
      solidity.profiles.test !== undefined,
      '"test" profile should exist',
    );
  });

  it("returns config unchanged when solidity is undefined", async () => {
    const result = await extendUserConfig({}, next);
    assert.equal(result.solidity, undefined);
  });
});
