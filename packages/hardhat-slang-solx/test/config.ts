/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveUserConfig,
  validateResolvedConfig,
  validateUserConfig,
} from "../src/internal/hook-handlers/config.js";
import { SOLX_DEBUG_INFO_SELECTORS } from "../src/internal/slang-solx-compiler.js";

describe("hardhat-slang-solx plugin config validation", () => {
  it("accepts valid config with dangerouslyAllowSlangSolxInProduction", async () => {
    const errors = await validateUserConfig({
      slangSolx: {
        dangerouslyAllowSlangSolxInProduction: true,
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts empty plugin config", async () => {
    const errors = await validateUserConfig({
      slangSolx: {},
    });
    assert.deepEqual(errors, []);
  });

  it("accepts config without plugin config key", async () => {
    const errors = await validateUserConfig({});
    assert.deepEqual(errors, []);
  });

  it("rejects invalid dangerouslyAllowSlangSolxInProduction type", async () => {
    const errors = await validateUserConfig({
      slangSolx: { dangerouslyAllowSlangSolxInProduction: "yes" as any },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("rejects non-boolean dangerouslyAllowSlangSolxInProduction", async () => {
    const errors = await validateUserConfig({
      slangSolx: {
        dangerouslyAllowSlangSolxInProduction: 1 as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });
});

describe("hardhat-slang-solx plugin config resolution", () => {
  function makeNext(profiles: Record<string, any>) {
    return async (config: any, _resolve: any) => ({
      ...config,
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc"],
      },
    });
  }

  it("resolves with defaults when no plugin config provided", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(
      resolvedConfig.slangSolx.dangerouslyAllowSlangSolxInProduction,
      false,
    );
  });

  it("resolves dangerouslyAllowSlangSolxInProduction from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { slangSolx: { dangerouslyAllowSlangSolxInProduction: true } },
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(
      resolvedConfig.slangSolx.dangerouslyAllowSlangSolxInProduction,
      true,
    );
  });

  it("registers 'slangSolx' as a compiler type", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.deepEqual(
      resolvedConfig.solidity.registeredCompilerTypes,
      ["solc", "slangSolx"],
      "the plugin registers 'slangSolx' and leaves core's 'solc' in place, and registers nothing else",
    );
  });

  it("does not inject any additional profiles", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    const profileNames = Object.keys(resolvedConfig.solidity.profiles);
    assert.deepEqual(profileNames, ["default"]);
  });

  it("adds solx debugInfo selectors to slangSolx-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slangSolx",
              settings: { outputSelection: { "*": { "*": ["abi"] } } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    const wildcardSelectors = slangSolxCompiler.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected resolved solx compiler config to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
    assert.ok(
      wildcardSelectors.includes("abi"),
      "user-provided selectors must be preserved alongside the augmentation",
    );
  });

  it("does NOT add solx selectors to non-slangSolx compilers", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              settings: { outputSelection: { "*": { "*": ["abi"] } } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const solcCompiler = resolvedConfig.solidity.profiles.default.compilers[0];
    const wildcardSelectors = solcCompiler.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(
        !wildcardSelectors.includes(selector),
        `solc-typed compiler must NOT receive solx selector "${selector}"; got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("augments slangSolx-typed override entries too", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {
            "contracts/Special.sol": {
              version: "0.8.34",
              type: "slangSolx",
              settings: {},
            },
          },
        },
      }),
    );

    const override =
      resolvedConfig.solidity.profiles["slang-solx"].overrides[
        "contracts/Special.sol"
      ];
    const wildcardSelectors = override.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected solx override to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("defaults the optimizer mode on slangSolx-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    assert.equal(slangSolxCompiler.settings.optimizer.mode, "1");
  });

  it("lets a user-set optimizer mode win over the solx default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slangSolx",
              settings: { optimizer: { enabled: true, mode: "z" } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    assert.deepEqual(slangSolxCompiler.settings.optimizer, {
      enabled: true,
      mode: "z",
    });
  });

  it("fills the optimizer mode without clobbering other user optimizer fields", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slangSolx",
              settings: { optimizer: { enabled: true } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    assert.deepEqual(slangSolxCompiler.settings.optimizer, {
      enabled: true,
      mode: "1",
    });
  });

  it("does not let an undefined user optimizer mode clobber the default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slangSolx",
              settings: { optimizer: { enabled: true, mode: undefined } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    assert.equal(slangSolxCompiler.settings.optimizer.mode, "1");
  });

  it("defaults viaIR to false on slangSolx-typed compilers, letting a user value win", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {
            "contracts/ViaIR.sol": {
              version: "0.8.34",
              type: "slangSolx",
              settings: { viaIR: true },
            },
          },
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    assert.equal(slangSolxCompiler.settings.viaIR, false);
    const override =
      resolvedConfig.solidity.profiles["slang-solx"].overrides[
        "contracts/ViaIR.sol"
      ];
    assert.equal(override.settings.viaIR, true);
    assert.equal(override.settings.optimizer.mode, "1");
  });

  it("preserves user-set settings (e.g. evmVersion) while adding solx defaults", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slangSolx",
              settings: { evmVersion: "prague" },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangSolxCompiler =
      resolvedConfig.solidity.profiles["slang-solx"].compilers[0];
    // An arbitrary user solc setting survives config resolution untouched...
    assert.equal(slangSolxCompiler.settings.evmVersion, "prague");
    // ...alongside a default the plugin fills in (the mode default has its own test).
    assert.equal(slangSolxCompiler.settings.viaIR, false);
  });
});

describe("hardhat-slang-solx EVM version validation", () => {
  it("rejects type: 'slangSolx' with pre-cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { evmVersion: "paris" },
              },
            ],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes("EVM versions")),
      `Expected EVM version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects type: 'slangSolx' with shanghai evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { evmVersion: "shanghai" },
              },
            ],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("accepts type: 'slangSolx' with cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { evmVersion: "cancun" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slangSolx' with prague evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { evmVersion: "prague" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slangSolx' with osaka evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { evmVersion: "osaka" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slangSolx' without evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [{ version: "0.8.34", type: "slangSolx" }],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("ignores evmVersion on non-slangSolx compiler entries", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                settings: { evmVersion: "paris" },
              },
            ],
          },
        },
      },
    });
    const evmErrors = errors.filter((e) => e.message.includes("EVM versions"));
    assert.deepEqual(evmErrors, []);
  });

  it("reports errors for overrides with unsupported evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [{ version: "0.8.34" }],
            overrides: {
              "contracts/Old.sol": {
                version: "0.8.34",
                type: "slangSolx",
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

describe("hardhat-slang-solx Solidity version validation", () => {
  it("rejects type: 'slangSolx' with unsupported Solidity version", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [{ version: "0.8.28", type: "slangSolx" }],
          },
        },
      },
    });
    assert.ok(
      errors.some((e) => e.message.includes("Solx only supports versions")),
      `Expected Solidity version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("accepts type: 'slangSolx' with supported Solidity version 0.8.34", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [{ version: "0.8.34", type: "slangSolx" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Solx only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'slangSolx' with supported version and custom path", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                path: "/tmp/solx-custom",
              },
            ],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Solx only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'slangSolx' with unsupported version when path is set", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.35",
                type: "slangSolx",
                path: "/tmp/solx-nightly",
              },
            ],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Solx only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("rejects unsupported version when path is empty string", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [{ version: "0.8.35", type: "slangSolx", path: "" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Solx only supports versions"),
    );
    assert.ok(
      versionErrors.length > 0,
      "Expected version validation error for empty path",
    );
  });
});

describe("hardhat-slang-solx resolved config validation", () => {
  function makeResolvedConfig(
    profiles: Record<string, any>,
    opts?: { dangerouslyAllowSlangSolxInProduction?: boolean },
  ): any {
    return {
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc", "slangSolx"],
      },
      slangSolx: {
        dangerouslyAllowSlangSolxInProduction:
          opts?.dangerouslyAllowSlangSolxInProduction ?? false,
      },
    };
  }

  it("errors when no 'slang-solx' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes('no "slang-solx" build profile')),
      `Expected missing slang-solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes when 'slang-solx' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("errors when type: 'slangSolx' appears in a non-slang-solx profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang-solx" build profile'),
      ),
      `Expected non-slang-solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("default")),
      `Error path should reference 'default' profile`,
    );
  });

  it("errors when type: 'slangSolx' appears in non-slang-solx profile overrides", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {
            "MyContract.sol": {
              version: "0.8.34",
              type: "slangSolx",
              settings: {},
            },
          },
        },
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang-solx" build profile'),
      ),
      `Expected non-slang-solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("overrides")),
      `Error path should include 'overrides'`,
    );
  });

  it("allows type: 'slangSolx' in non-slang-solx profiles with dangerouslyAllowSlangSolxInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
            overrides: {},
          },
          "slang-solx": {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangSolxInProduction: true },
      ),
    );
    assert.deepEqual(errors, []);
  });

  it("allows type: 'slangSolx' in the slang-solx profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        "slang-solx": {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("still requires slang-solx profile even with dangerouslyAllowSlangSolxInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slangSolx", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangSolxInProduction: true },
      ),
    );
    assert.ok(
      errors.some((e) => e.message.includes('no "slang-solx" build profile')),
      `Should still require slang-solx profile, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });
});

describe("hardhat-slang-solx optimizer mode validation", () => {
  async function validateMode(mode: string) {
    return await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { optimizer: { mode } },
              },
            ],
          },
        },
      },
    });
  }

  for (const mode of ["1", "2", "3", "s", "z"]) {
    it(`accepts the optimizer mode "${mode}"`, async () => {
      assert.deepEqual(await validateMode(mode), []);
    });
  }

  // The likeliest mistake: there is no mode that turns optimization off.
  it('rejects the optimizer mode "0"', async () => {
    const errors = await validateMode("0");

    assert.ok(
      errors.some((e) => e.message.includes("optimizer modes")),
      `Expected an optimizer mode error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects an uppercase size mode, which solx does not accept", async () => {
    const errors = await validateMode("Z");

    assert.ok(
      errors.some((e) => e.message.includes("optimizer modes")),
      `Expected an optimizer mode error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("leaves the other optimizer settings alone", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          "slang-solx": {
            compilers: [
              {
                version: "0.8.34",
                type: "slangSolx",
                settings: { optimizer: { enabled: true, runs: 200 } },
              },
            ],
          },
        },
      },
    });

    assert.deepEqual(errors, []);
  });
});
