/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveUserConfig,
  validateResolvedConfig,
  validateUserConfig,
} from "../src/internal/hook-handlers/config.js";
import { SLANG_DEBUG_INFO_SELECTORS } from "../src/internal/slang-compiler.js";

describe("hardhat-slang plugin config validation", () => {
  it("accepts valid config with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateUserConfig({
      slang: {
        dangerouslyAllowSlangInProduction: true,
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts empty plugin config", async () => {
    const errors = await validateUserConfig({
      slang: {},
    });
    assert.deepEqual(errors, []);
  });

  it("accepts config without plugin config key", async () => {
    const errors = await validateUserConfig({});
    assert.deepEqual(errors, []);
  });

  it("rejects invalid dangerouslyAllowSlangInProduction type", async () => {
    const errors = await validateUserConfig({
      slang: { dangerouslyAllowSlangInProduction: "yes" as any },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("rejects non-boolean dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateUserConfig({
      slang: {
        dangerouslyAllowSlangInProduction: 1 as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });
});

describe("hardhat-slang plugin config resolution", () => {
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

    assert.equal(resolvedConfig.slang.dangerouslyAllowSlangInProduction, false);
  });

  it("resolves dangerouslyAllowSlangInProduction from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { slang: { dangerouslyAllowSlangInProduction: true } },
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

    assert.equal(resolvedConfig.slang.dangerouslyAllowSlangInProduction, true);
  });

  it("registers 'slang' as a compiler type", async () => {
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
      ["solc", "slang"],
      "the plugin registers 'slang' and leaves core's 'solc' in place, and registers nothing else",
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

  it("adds slang debugInfo selectors to slang-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { outputSelection: { "*": { "*": ["abi"] } } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    const wildcardSelectors = slangCompiler.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected resolved slang compiler config to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
    assert.ok(
      wildcardSelectors.includes("abi"),
      "user-provided selectors must be preserved alongside the augmentation",
    );
  });

  it("does NOT add slang selectors to non-slang compilers", async () => {
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
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        !wildcardSelectors.includes(selector),
        `solc-typed compiler must NOT receive slang selector "${selector}"; got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("augments slang-typed override entries too", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {
            "contracts/Special.sol": {
              version: "0.8.34",
              type: "slang",
              settings: {},
            },
          },
        },
      }),
    );

    const override =
      resolvedConfig.solidity.profiles.slang.overrides["contracts/Special.sol"];
    const wildcardSelectors = override.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected slang override to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("defaults the optimizer mode on slang-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.equal(slangCompiler.settings.optimizer.mode, "1");
  });

  it("lets a user-set optimizer mode win over the slang default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true, mode: "z" } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.deepEqual(slangCompiler.settings.optimizer, {
      enabled: true,
      mode: "z",
    });
  });

  it("fills the optimizer mode without clobbering other user optimizer fields", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.deepEqual(slangCompiler.settings.optimizer, {
      enabled: true,
      mode: "1",
    });
  });

  it("does not let an undefined user optimizer mode clobber the default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true, mode: undefined } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.equal(slangCompiler.settings.optimizer.mode, "1");
  });

  it("defaults viaIR to false on slang-typed compilers, letting a user value win", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {
            "contracts/ViaIR.sol": {
              version: "0.8.34",
              type: "slang",
              settings: { viaIR: true },
            },
          },
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.equal(slangCompiler.settings.viaIR, false);
    const override =
      resolvedConfig.solidity.profiles.slang.overrides["contracts/ViaIR.sol"];
    assert.equal(override.settings.viaIR, true);
    assert.equal(override.settings.optimizer.mode, "1");
  });

  it("preserves user-set settings (e.g. evmVersion) while adding slang defaults", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { evmVersion: "prague" },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    // An arbitrary user solc setting survives config resolution untouched...
    assert.equal(slangCompiler.settings.evmVersion, "prague");
    // ...alongside a default the plugin fills in (the mode default has its own test).
    assert.equal(slangCompiler.settings.viaIR, false);
  });
});

describe("hardhat-slang EVM version validation", () => {
  it("rejects type: 'slang' with pre-cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
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

  it("rejects type: 'slang' with shanghai evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
                settings: { evmVersion: "shanghai" },
              },
            ],
          },
        },
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("accepts type: 'slang' with cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
                settings: { evmVersion: "cancun" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slang' with prague evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
                settings: { evmVersion: "prague" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slang' with osaka evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
                settings: { evmVersion: "osaka" },
              },
            ],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts type: 'slang' without evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [{ version: "0.8.34", type: "slang" }],
          },
        },
      },
    });
    assert.deepEqual(errors, []);
  });

  it("ignores evmVersion on non-slang compiler entries", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
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
          slang: {
            compilers: [{ version: "0.8.34" }],
            overrides: {
              "contracts/Old.sol": {
                version: "0.8.34",
                type: "slang",
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

describe("hardhat-slang Solidity version validation", () => {
  it("rejects type: 'slang' with unsupported Solidity version", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [{ version: "0.8.28", type: "slang" }],
          },
        },
      },
    });
    assert.ok(
      errors.some((e) => e.message.includes("Slang only supports versions")),
      `Expected Solidity version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("accepts type: 'slang' with supported Solidity version 0.8.34", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [{ version: "0.8.34", type: "slang" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Slang only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'slang' with supported version and custom path", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
                path: "/tmp/slang-custom",
              },
            ],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Slang only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'slang' with unsupported version when path is set", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.35",
                type: "slang",
                path: "/tmp/slang-nightly",
              },
            ],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Slang only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("rejects unsupported version when path is empty string", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [{ version: "0.8.35", type: "slang", path: "" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Slang only supports versions"),
    );
    assert.ok(
      versionErrors.length > 0,
      "Expected version validation error for empty path",
    );
  });
});

describe("hardhat-slang resolved config validation", () => {
  function makeResolvedConfig(
    profiles: Record<string, any>,
    opts?: { dangerouslyAllowSlangInProduction?: boolean },
  ): any {
    return {
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc", "slang"],
      },
      slang: {
        dangerouslyAllowSlangInProduction:
          opts?.dangerouslyAllowSlangInProduction ?? false,
      },
    };
  }

  it("errors when no 'slang' build profile exists", async () => {
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
      errors.some((e) => e.message.includes('no "slang" build profile')),
      `Expected missing slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes when 'slang' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("errors when type: 'slang' appears in a non-slang profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang" build profile'),
      ),
      `Expected non-slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("default")),
      `Error path should reference 'default' profile`,
    );
  });

  it("errors when type: 'slang' appears in non-slang profile overrides", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {
            "MyContract.sol": {
              version: "0.8.34",
              type: "slang",
              settings: {},
            },
          },
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang" build profile'),
      ),
      `Expected non-slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("overrides")),
      `Error path should include 'overrides'`,
    );
  });

  it("allows type: 'slang' in non-slang profiles with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
          slang: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangInProduction: true },
      ),
    );
    assert.deepEqual(errors, []);
  });

  it("allows type: 'slang' in the slang profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("still requires slang profile even with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangInProduction: true },
      ),
    );
    assert.ok(
      errors.some((e) => e.message.includes('no "slang" build profile')),
      `Should still require slang profile, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });
});

describe("hardhat-slang optimizer mode validation", () => {
  async function validateMode(mode: string) {
    return await validateUserConfig({
      solidity: {
        profiles: {
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
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

  it("rejects an uppercase size mode, which slang does not accept", async () => {
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
          slang: {
            compilers: [
              {
                version: "0.8.34",
                type: "slang",
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
