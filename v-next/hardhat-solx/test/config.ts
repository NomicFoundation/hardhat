/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveUserConfig,
  validateResolvedConfig,
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
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(resolvedConfig.solx.dangerouslyAllowSolxInProduction, false);
  });

  it("resolves dangerouslyAllowSolxInProduction from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { solx: { dangerouslyAllowSolxInProduction: true } },
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(resolvedConfig.solx.dangerouslyAllowSolxInProduction, true);
  });

  it("registers 'solx' as a compiler type", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.ok(
      resolvedConfig.solidity.registeredCompilerTypes.includes("solx"),
      "registeredCompilerTypes should contain 'solx'",
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
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
      }),
    );

    const profileNames = Object.keys(resolvedConfig.solidity.profiles);
    assert.deepEqual(profileNames, ["default"]);
  });
});

describe("hardhat-solx EVM version validation", () => {
  it("rejects type: 'solx' with pre-cancun evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
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
      errors.some((e) => e.message.includes("EVM versions")),
      `Expected EVM version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects type: 'solx' with shanghai evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
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
          solx: {
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
          solx: {
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
          solx: {
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
          solx: {
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
          solx: {
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
    const evmErrors = errors.filter((e) => e.message.includes("EVM versions"));
    assert.deepEqual(evmErrors, []);
  });

  it("reports errors for overrides with unsupported evmVersion", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
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
          solx: {
            compilers: [{ version: "0.8.28", type: "solx" }],
          },
        },
      },
    });
    assert.ok(
      errors.some((e) => e.message.includes("Solx only supports versions")),
      `Expected Solidity version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("accepts type: 'solx' with supported Solidity version 0.8.33", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
            compilers: [{ version: "0.8.33", type: "solx" }],
          },
        },
      },
    });
    const versionErrors = errors.filter((e) =>
      e.message.includes("Solx only supports versions"),
    );
    assert.deepEqual(versionErrors, []);
  });

  it("accepts type: 'solx' with supported version and custom path", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
            compilers: [
              { version: "0.8.33", type: "solx", path: "/tmp/solx-custom" },
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

  it("accepts type: 'solx' with unsupported version when path is set", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          solx: {
            compilers: [
              { version: "0.8.34", type: "solx", path: "/tmp/solx-nightly" },
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
});

describe("hardhat-solx resolved config validation", () => {
  function makeResolvedConfig(
    profiles: Record<string, any>,
    opts?: { dangerouslyAllowSolxInProduction?: boolean },
  ): any {
    return {
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc", "solx"],
      },
      solx: {
        dangerouslyAllowSolxInProduction:
          opts?.dangerouslyAllowSolxInProduction ?? false,
      },
    };
  }

  it("errors when no 'solx' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes('no "solx" build profile')),
      `Expected missing solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes when 'solx' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
        solx: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("errors when type: 'solx' appears in a non-solx profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
          overrides: {},
        },
        solx: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "solx" build profile'),
      ),
      `Expected non-solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("default")),
      `Error path should reference 'default' profile`,
    );
  });

  it("errors when type: 'solx' appears in non-solx profile overrides", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {
            "MyContract.sol": { version: "0.8.33", type: "solx", settings: {} },
          },
        },
        solx: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "solx" build profile'),
      ),
      `Expected non-solx profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("overrides")),
      `Error path should include 'overrides'`,
    );
  });

  it("allows type: 'solx' in non-solx profiles with dangerouslyAllowSolxInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
            overrides: {},
          },
          solx: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSolxInProduction: true },
      ),
    );
    assert.deepEqual(errors, []);
  });

  it("allows type: 'solx' in the solx profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", settings: {} }],
          overrides: {},
        },
        solx: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("still requires solx profile even with dangerouslyAllowSolxInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.33", type: "solx", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSolxInProduction: true },
      ),
    );
    assert.ok(
      errors.some((e) => e.message.includes('no "solx" build profile')),
      `Should still require solx profile, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });
});
