/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import type { HardhatUserConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveUserConfig,
  validateUserConfig,
} from "../src/internal/hook-handlers/config.js";

describe("hardhat-solx plugin config validation", () => {
  it("accepts valid config with dangerouslyAllowSolxInProduction", async () => {
    const errors = await validateUserConfig({
      solx: {
        dangerouslyAllowSolxInProduction: true,
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts empty plugin config", async () => {
    const errors = await validateUserConfig({
      solx: {},
    });
    assert.deepEqual(errors, []);
  });

  it("accepts config without plugin config key", async () => {
    const errors = await validateUserConfig({});
    assert.deepEqual(errors, []);
  });

  it("rejects invalid dangerouslyAllowSolxInProduction type", async () => {
    const errors = await validateUserConfig({
      solx: { dangerouslyAllowSolxInProduction: "yes" as any },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("rejects non-boolean dangerouslyAllowSolxInProduction", async () => {
    const errors = await validateUserConfig({
      solx: {
        dangerouslyAllowSolxInProduction: 1 as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });
});

describe("hardhat-solx plugin config resolution", () => {
  it("resolves with defaults when no plugin config provided", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      async (config: any, _resolve: any) => ({
        ...config,
        solidity: {
          profiles: {
            default: {
              isolated: false,
              preferWasm: false,
              compilers: [{ version: "0.8.33", settings: {} }],
              overrides: {},
            },
          },
          npmFilesToBuild: [],
          registeredCompilerTypes: ["solc"],
        },
      }),
    );

    assert.equal(resolvedConfig.solx.dangerouslyAllowSolxInProduction, false);
  });

  it("resolves dangerouslyAllowSolxInProduction from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { solx: { dangerouslyAllowSolxInProduction: true } },
      undefined as any,
      async (config: any, _resolve: any) => ({
        ...config,
        solidity: {
          profiles: {
            default: {
              isolated: false,
              preferWasm: false,
              compilers: [{ version: "0.8.33", settings: {} }],
              overrides: {},
            },
          },
          npmFilesToBuild: [],
          registeredCompilerTypes: ["solc"],
        },
      }),
    );

    assert.equal(resolvedConfig.solx.dangerouslyAllowSolxInProduction, true);
  });

  it("registers 'solx' as a compiler type", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      async (config: any, _resolve: any) => ({
        ...config,
        solidity: {
          profiles: {
            default: {
              isolated: false,
              preferWasm: false,
              compilers: [{ version: "0.8.33", settings: {} }],
              overrides: {},
            },
          },
          npmFilesToBuild: [],
          registeredCompilerTypes: ["solc"],
        },
      }),
    );

    assert.ok(
      resolvedConfig.solidity.registeredCompilerTypes.includes("solx"),
      "registeredCompilerTypes should contain 'solx'",
    );
  });
});

describe("hardhat-solx test profile creation (resolveUserConfig)", () => {
  function makeResolvedDefault(
    compilers: Array<{ version: string; type?: string; settings?: any }>,
    overrides: Record<
      string,
      { version: string; type?: string; settings?: any }
    > = {},
  ) {
    return async (config: any, _resolve: any) => ({
      ...config,
      solidity: {
        profiles: {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: compilers.map((c) => ({
              settings: {},
              ...c,
            })),
            overrides: Object.fromEntries(
              Object.entries(overrides).map(([key, val]) => [
                key,
                { settings: {}, ...val },
              ]),
            ),
          },
        },
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc"],
      },
    });
  }

  it("creates test profile with type: 'solx' for supported versions", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeResolvedDefault([{ version: "0.8.33" }]),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    assert.ok(testProfile !== undefined, '"test" profile should exist');
    assert.equal(testProfile.compilers[0].type, "solx");
    assert.deepEqual(
      testProfile.compilers[0].settings,
      {},
      "settings should be stripped for solx entries",
    );
  });

  it("preserves compiler type for unsupported versions", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeResolvedDefault([{ version: "0.8.28" }]),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    assert.ok(testProfile !== undefined, '"test" profile should exist');
    assert.equal(
      testProfile.compilers[0].type,
      undefined,
      "unsupported version should keep original type",
    );
  });

  it("creates test profile with mixed supported/unsupported versions", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeResolvedDefault([{ version: "0.8.28" }, { version: "0.8.33" }]),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    assert.ok(testProfile !== undefined, '"test" profile should exist');
    assert.equal(
      testProfile.compilers[0].type,
      undefined,
      "0.8.28 should keep original type",
    );
    assert.equal(
      testProfile.compilers[1].type,
      "solx",
      "0.8.33 should get type: solx",
    );
  });

  it("handles overrides in test profile creation", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeResolvedDefault([{ version: "0.8.33" }], {
        "contracts/Special.sol": { version: "0.8.30" },
      }),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    const override = testProfile.overrides["contracts/Special.sol"];
    assert.ok(override !== undefined, "override should exist in test profile");
    assert.equal(override.type, "solx", "0.8.30 is supported → type: solx");
    assert.deepEqual(override.settings, {}, "settings stripped for solx");
  });

  it("preserves user-defined test profile", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      async (config: any, _resolve: any) => ({
        ...config,
        solidity: {
          profiles: {
            default: {
              isolated: false,
              preferWasm: false,
              compilers: [{ version: "0.8.33", settings: {} }],
              overrides: {},
            },
            test: {
              isolated: true,
              preferWasm: false,
              compilers: [{ version: "0.8.33", settings: { custom: true } }],
              overrides: {},
            },
          },
          npmFilesToBuild: [],
          registeredCompilerTypes: ["solc"],
        },
      }),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    // User's test profile should be untouched
    assert.equal(testProfile.isolated, true);
    assert.deepEqual(testProfile.compilers[0].settings, { custom: true });
    assert.equal(
      testProfile.compilers[0].type,
      undefined,
      "should not inject type: solx into user-defined test profile",
    );
  });

  it("copies isolated and preferWasm from default profile", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      async (config: any, _resolve: any) => ({
        ...config,
        solidity: {
          profiles: {
            default: {
              isolated: true,
              preferWasm: true,
              compilers: [{ version: "0.8.33", settings: {} }],
              overrides: {},
            },
          },
          npmFilesToBuild: [],
          registeredCompilerTypes: ["solc"],
        },
      }),
    );

    const testProfile = resolvedConfig.solidity.profiles.test;
    assert.equal(testProfile.isolated, true);
    assert.equal(testProfile.preferWasm, true);
  });
});

describe("hardhat-solx EVM version validation", () => {
  it("rejects type: 'solx' with pre-cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "paris" },
              },
            ],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes("does not support EVM version")),
      `Expected EVM version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects type: 'solx' with shanghai evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "shanghai" },
              },
            ],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("accepts type: 'solx' with cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "cancun" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'solx' with prague evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "prague" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'solx' with osaka evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "osaka" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'solx' without evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("ignores evmVersion on non-solx compiler entries", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [
              {
                version: "0.8.33",
                settings: { evmVersion: "paris" },
              },
            ],
          },
        },
      },
    });
    // Filter to only EVM version errors (ignore plugin-is-useful, etc.)
    const evmErrors = errors.filter((e) =>
      e.message.includes("does not support EVM version"),
    );
    assert.deepEqual(evmErrors, []);
  });

  it("reports errors for overrides with unsupported evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.33" }],
            overrides: {
              "contracts/Old.sol": {
                version: "0.8.33",
                type: "solx",
                settings: { evmVersion: "london" },
              },
            },
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors[0].path.includes("overrides"),
      `Error path should include 'overrides', got: ${JSON.stringify(errors[0].path)}`,
    );
  });
});

describe("hardhat-solx Solidity version validation", () => {
  it("rejects type: 'solx' with unsupported Solidity version", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.28", type: "solx" }],
          },
        },
      },
    });
    assert.ok(
      errors.some((e) => e.message.includes("not supported by solx")),
      `Expected Solidity version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("accepts type: 'solx' with supported Solidity version 0.8.33", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    // Filter out the "plugin is useful" errors — here we only care about version validation
    const versionErrors = errors.filter((e) =>
      e.message.includes("not supported by solx"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'solx' with supported Solidity version 0.8.30", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.30", type: "solx" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("not supported by solx"),
    );
    assert.deepEqual(versionErrors, []);
  });
});

describe("hardhat-solx plugin-is-useful validation", () => {
  it("errors when no compiler versions are supported by solx", async () => {
    const errors = await validateUserConfig({
      solidity: {
        compilers: [{ version: "0.8.28" }, { version: "0.8.29" }],
      },
    });
    assert.ok(
      errors.some((e) =>
        e.message.includes("none of the configured Solidity versions"),
      ),
      `Expected plugin-is-useful error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes when at least one version is supported", async () => {
    const errors = await validateUserConfig({
      solidity: {
        compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
      },
    });
    const usefulErrors = errors.filter((e) =>
      e.message.includes("none of the configured Solidity versions"),
    );
    assert.deepEqual(usefulErrors, []);
  });

  it("passes for string config with supported version", async () => {
    const errors = await validateUserConfig({
      solidity: "0.8.33",
    });
    const usefulErrors = errors.filter((e) =>
      e.message.includes("none of the configured Solidity versions"),
    );
    assert.deepEqual(usefulErrors, []);
  });

  it("errors for string config with unsupported version", async () => {
    const errors = await validateUserConfig({
      solidity: "0.8.28",
    });
    assert.ok(
      errors.some((e) =>
        e.message.includes("none of the configured Solidity versions"),
      ),
      `Expected plugin-is-useful error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes for array config with at least one supported version", async () => {
    const errors = await validateUserConfig({
      solidity: ["0.8.28", "0.8.30"],
    });
    const usefulErrors = errors.filter((e) =>
      e.message.includes("none of the configured Solidity versions"),
    );
    assert.deepEqual(usefulErrors, []);
  });

  it("passes when no solidity config at all", async () => {
    const errors = await validateUserConfig({});
    const usefulErrors = errors.filter((e) =>
      e.message.includes("none of the configured Solidity versions"),
    );
    assert.deepEqual(usefulErrors, []);
  });
});

describe("hardhat-solx production profile safeguard", () => {
  it("rejects type: 'solx' in production profile", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: { version: "0.8.33" },
          production: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) =>
        e.message.includes("not supported in the production build profile"),
      ),
      `Expected production safeguard error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects single-version solx in production profile", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: { version: "0.8.33" },
          production: { version: "0.8.33", type: "solx" },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("accepts type: 'solx' in production with dangerouslyAllowSolxInProduction", async () => {
    const errors = await validateUserConfig({
      solx: { dangerouslyAllowSolxInProduction: true },
      solidity: {
        profiles: {
          default: { version: "0.8.33" },
          production: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'solx' in non-production profiles", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
          test: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    // Filter out non-production errors
    const prodErrors = errors.filter((e) => e.message.includes("production"));
    assert.deepEqual(prodErrors, []);
  });

  it("accepts production profile without type: 'solx'", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          default: { version: "0.8.33" },
          production: { version: "0.8.33" },
        },
      },
    });
    // Filter out non-production errors
    const prodErrors = errors.filter((e) => e.message.includes("production"));
    assert.deepEqual(prodErrors, []);
  });
});
