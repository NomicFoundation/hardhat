/* eslint-disable @typescript-eslint/consistent-type-assertions -- test*/
import type {
  SolcConfig,
  SolidityCompilerConfig,
} from "../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSolcConfig } from "../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import { missesSomeOfficialNativeBuilds } from "../../../../src/internal/builtin-plugins/solidity/build-system/solc-info.js";
import {
  resolveSolidityUserConfig,
  validateSolidityUserConfig,
} from "../../../../src/internal/builtin-plugins/solidity/config.js";

describe("solidity plugin config validation", () => {
  describe("sources paths", () => {
    it("Should reject invalid values in `config.paths.sources`", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          paths: 123,
        }),
        [
          {
            message: "Expected object, received number",
            path: ["paths"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: 123,
          },
        }),
        [
          {
            message:
              "Expected a string, an array of strings, or an object with an optional 'solidity' property",
            path: ["paths", "sources"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: [],
          },
        }),
        [
          {
            message: "Array must contain at least 1 element(s)",
            path: ["paths", "sources"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: {
              solidity: 123,
            },
          },
        }),
        [
          {
            message: "Expected a string or an array of strings",
            path: ["paths", "sources", "solidity"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: {
              solidity: {},
            },
          },
        }),
        [
          {
            message: "Expected a string or an array of strings",
            path: ["paths", "sources", "solidity"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: {
              solidity: [],
            },
          },
        }),
        [
          {
            message: "Array must contain at least 1 element(s)",
            path: ["paths", "sources", "solidity"],
          },
        ],
      );
    });

    it("Should accept valid values in `config.paths.sources`", () => {
      assert.deepEqual(validateSolidityUserConfig({}), []);

      assert.deepEqual(validateSolidityUserConfig({ paths: {} }), []);

      assert.deepEqual(
        validateSolidityUserConfig({ paths: { sources: "contracts" } }),
        [],
      );

      assert.deepEqual(
        validateSolidityUserConfig({ paths: { sources: ["contracts"] } }),
        [],
      );

      assert.deepEqual(
        validateSolidityUserConfig({ paths: { sources: {} } }),
        [],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: {
              solidity: "contracts",
            },
          },
        }),
        [],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          paths: {
            sources: {
              solidity: ["contracts"],
            },
          },
        }),
        [],
      );
    });
  });

  describe("solidity config", () => {
    it("Should reject invalid values in `config.solidity`", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: 123,
        }),
        [
          {
            message:
              "Expected a version string, an array of version strings, or an object configuring one or more versions of Solidity or multiple build profiles",
            path: ["solidity"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: [],
        }),
        [
          {
            message: "Array must contain at least 1 element(s)",
            path: ["solidity"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {},
        }),
        [
          {
            message:
              "Expected a version string, an array of version strings, or an object configuring one or more versions of Solidity or multiple build profiles",
            path: ["solidity"],
          },
        ],
      );
    });

    it("Should reject clashes between Solidity config types", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            version: "0.8.0",
            compilers: 123,
          },
        }),
        [
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "compilers"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            version: "0.8.0",
            profiles: 123,
          },
        }),
        [
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "profiles"],
          },
        ],
      );

      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [
              {
                version: "0.8.0",
              },
            ],
            profiles: 123,
          },
        }),
        [
          {
            message: "This field is incompatible with `compilers`",
            path: ["solidity", "profiles"],
          },
        ],
      );
    });

    it("Should reject invalid SingleVersionSolidityUserConfig values", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            version: 123,
            npmFilesToBuild: {},
            isolated: "false",
          },
        }),
        [
          {
            message: "Expected string, received number",
            path: ["solidity", "version"],
          },
          {
            message: "Expected boolean, received string",
            path: ["solidity", "isolated"],
          },
          {
            message: "Expected array, received object",
            path: ["solidity", "npmFilesToBuild"],
          },
        ],
      );
    });

    it("Should reject invalid MultiVersionSolidityUserConfig values", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [
              {
                version: 123,
              },
            ],
            overrides: [],
            isolated: "false",
          },
        }),
        [
          {
            message: "Expected boolean, received string",
            path: ["solidity", "isolated"],
          },
          {
            message: "Expected string, received number",
            path: ["solidity", "compilers", 0, "version"],
          },
          {
            message: "Expected object, received array",
            path: ["solidity", "overrides"],
          },
        ],
      );
    });

    it("Should reject invalid BuildProfilesSolidityUserConfig values", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            profiles: {
              default: {
                version: 123,
                isolated: "false",
              },
              production: {
                version: "0.8.0",
                compilers: [
                  {
                    version: 123,
                  },
                ],
                overrides: [],
                isolated: "true",
              },
            },
          },
        }),
        [
          {
            message: "Expected string, received number",
            path: ["solidity", "profiles", "default", "version"],
          },
          {
            message: "Expected boolean, received string",
            path: ["solidity", "profiles", "default", "isolated"],
          },
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "profiles", "production", "compilers"],
          },
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "profiles", "production", "overrides"],
          },
          {
            message: "Expected boolean, received string",
            path: ["solidity", "profiles", "production", "isolated"],
          },
        ],
      );
    });

    it("Should accept solidity version strings", () => {
      assert.deepEqual(validateSolidityUserConfig({ solidity: "0.8.0" }), []);
    });

    it("Should accept an array of solidity version strings", () => {
      assert.deepEqual(
        validateSolidityUserConfig({ solidity: ["0.8.0", "0.8.1"] }),
        [],
      );
    });

    it("Should accept a SingleVersionSolidityUserConfig value", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            version: "0.8.0",
            settings: {
              optimizer: {
                enabled: true,
                runs: 200,
              },
            },
            npmFilesToBuild: ["./build.js"],
            isolated: false,
          },
        }),
        [],
      );
    });

    it("Should accept a MultiVersionSolidityUserConfig value", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [
              {
                version: "0.8.0",
                settings: {
                  optimizer: {
                    enabled: true,
                    runs: 200,
                  },
                },
              },
            ],
            overrides: {
              "contracts/Contract.sol": {
                version: "0.8.1",
                settings: {
                  optimizer: {
                    enabled: false,
                    runs: 100,
                  },
                },
              },
            },
            isolated: false,
          },
        }),
        [],
      );
    });

    it("Should accept a BuildProfilesSolidityUserConfig value", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            profiles: {
              default: {
                version: "0.8.0",
                settings: {
                  optimizer: {
                    enabled: true,
                    runs: 200,
                  },
                },
                isolated: false,
              },
              production: {
                compilers: [
                  {
                    version: "0.8.0",
                    settings: {
                      optimizer: {
                        enabled: true,
                        runs: 200,
                      },
                    },
                  },
                ],
                overrides: {
                  "contracts/Contract.sol": {
                    version: "0.8.1",
                    settings: {
                      optimizer: {
                        enabled: true,
                        runs: 300,
                      },
                    },
                  },
                },
                isolated: true,
              },
            },
          },
        }),
        [],
      );
    });
  });

  describe("per-compiler preferWasm validation", () => {
    it("Should accept preferWasm in SolcUserConfig", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [
              { version: "0.8.28", preferWasm: true },
              { version: "0.8.31", preferWasm: false },
            ],
          },
        }),
        [],
      );
    });

    it("Should reject invalid preferWasm values in SolcUserConfig", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ version: "0.8.28", preferWasm: "true" as any }],
          },
        }),
        [
          {
            message: "Expected boolean, received string",
            path: ["solidity", "compilers", 0, "preferWasm"],
          },
        ],
      );
    });

    it("Should accept preferWasm on compiler with type 'solc'", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ type: "solc", version: "0.8.28", preferWasm: true }],
          },
        }),
        [],
      );
    });

    it("Should reject preferWasm on compiler with non-solc type", () => {
      const errors = validateSolidityUserConfig({
        solidity: {
          compilers: [
            { type: "solx", version: "0.8.28", preferWasm: true } as any,
          ],
        },
      });
      assert.ok(
        errors.length > 0,
        "Should reject preferWasm on non-solc compiler type",
      );
    });
  });

  describe("per-compiler type validation", () => {
    it("Should accept type field in compiler config", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ version: "0.8.28", type: "solx" }],
          },
        }),
        [],
      );
    });

    it("Should accept missing type field (backward compat)", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ version: "0.8.28" }],
          },
        }),
        [],
      );
    });

    it("Should reject invalid type values", () => {
      const errors = validateSolidityUserConfig({
        solidity: {
          compilers: [{ version: "0.8.28", type: 123 as any }],
        },
      });
      assert.ok(
        errors.length > 0,
        "Should produce validation error for non-string type",
      );
    });
  });

  describe("per-compiler path validation", () => {
    it("Should accept path in SolcUserConfig", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ version: "0.8.28", path: "/path/to/solc" }],
          },
        }),
        [],
      );
    });

    it("Should reject invalid path values in SolcUserConfig", () => {
      assert.deepEqual(
        validateSolidityUserConfig({
          solidity: {
            compilers: [{ version: "0.8.28", path: 123 as any }],
          },
        }),
        [
          {
            message: "Expected string, received number",
            path: ["solidity", "compilers", 0, "path"],
          },
        ],
      );
    });
  });
});

describe("solidity plugin config resolution", () => {
  it.todo("should resolve a config with a single version string", () => {});

  it.todo("should resolve a config with multiple version strings", () => {});

  it.todo("should resolve a SingleVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a MultiVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a BuildProfilesSolidityUserConfig value", () => {});

  describe("profile-level preferWasm setting resolution", function () {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("resolves to false when build profile is production and preferWasm is not specified", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                preferWasm: false,
              },
            },
          },
        },
        otherResolvedConfig,
      );

      // Profile-level preferWasm now always defaults to false
      assert.equal(
        resolvedConfig.solidity.profiles.production.preferWasm,
        false,
      );
    });

    it("resolves to the specified value when set in the config, regardless of profile name", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                preferWasm: true,
              },
              production: {
                version: "0.8.28",
                preferWasm: false,
              },
            },
          },
        },
        otherResolvedConfig,
      );

      assert.equal(resolvedConfig.solidity.profiles.default.preferWasm, true);
      assert.equal(
        resolvedConfig.solidity.profiles.production.preferWasm,
        false,
      );
    });

    it("resolves to false when profile is not production and value is not set", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
              },
              profile_1: {
                version: "0.8.28",
              },
              profile_2: {
                version: "0.8.28",
              },
            },
          },
        },
        otherResolvedConfig,
      );

      assert.equal(resolvedConfig.solidity.profiles.default.preferWasm, false);
      assert.equal(
        resolvedConfig.solidity.profiles.profile_1.preferWasm,
        false,
      );
      assert.equal(
        resolvedConfig.solidity.profiles.profile_2.preferWasm,
        false,
      );
    });
  });

  describe("per-compiler preferWasm resolution", () => {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("should preserve per-compiler preferWasm when explicitly set", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [
              { version: "0.8.28", preferWasm: true },
              { version: "0.8.31", preferWasm: false },
            ],
          },
        },
        otherResolvedConfig,
      );

      const compilers = resolvedConfig.solidity.profiles.default.compilers;
      assert.equal((compilers[0] as SolcConfig).preferWasm, true);
      assert.equal((compilers[1] as SolcConfig).preferWasm, false);
    });

    it("should preserve per-compiler preferWasm in overrides when explicitly set", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ version: "0.8.28" }],
            overrides: {
              "contracts/Special.sol": { version: "0.8.31", preferWasm: true },
            },
          },
        },
        otherResolvedConfig,
      );

      const overrides = resolvedConfig.solidity.profiles.default.overrides;
      assert.equal(
        (overrides["contracts/Special.sol"] as SolcConfig).preferWasm,
        true,
      );
    });
  });

  describe(
    "ARM64 Linux per-compiler preferWasm defaults",
    {
      skip: !missesSomeOfficialNativeBuilds(),
    },
    () => {
      const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

      it("should default preferWasm to true in production profile for versions without official ARM64 builds", async () => {
        const resolvedConfig = await resolveSolidityUserConfig(
          {
            solidity: {
              compilers: [
                { version: "0.8.28" }, // No official ARM64 build
                { version: "0.8.30" }, // No official ARM64 build
              ],
            },
          },
          otherResolvedConfig,
        );

        // Production profile gets preferWasm: true for old versions
        const productionCompilers =
          resolvedConfig.solidity.profiles.production.compilers;
        assert.equal((productionCompilers[0] as SolcConfig).preferWasm, true);
        assert.equal((productionCompilers[1] as SolcConfig).preferWasm, true);
      });

      it("should leave preferWasm undefined in production profile for versions with official ARM64 builds", async () => {
        const resolvedConfig = await resolveSolidityUserConfig(
          {
            solidity: {
              compilers: [
                { version: "0.8.31" }, // Has official ARM64 build
                { version: "0.8.32" }, // Has official ARM64 build
              ],
            },
          },
          otherResolvedConfig,
        );

        // Production profile gets preferWasm: undefined for versions with official builds
        const productionCompilers =
          resolvedConfig.solidity.profiles.production.compilers;
        assert.equal(
          (productionCompilers[0] as SolcConfig).preferWasm,
          undefined,
        );
        assert.equal(
          (productionCompilers[1] as SolcConfig).preferWasm,
          undefined,
        );
      });

      it("should leave preferWasm undefined in default profile for all versions", async () => {
        const resolvedConfig = await resolveSolidityUserConfig(
          {
            solidity: {
              compilers: [
                { version: "0.8.28" }, // No official ARM64 build
                { version: "0.8.31" }, // Has official ARM64 build
              ],
            },
          },
          otherResolvedConfig,
        );

        // Default profile gets preferWasm: undefined for all versions
        const defaultCompilers =
          resolvedConfig.solidity.profiles.default.compilers;
        assert.equal((defaultCompilers[0] as SolcConfig).preferWasm, undefined);
        assert.equal((defaultCompilers[1] as SolcConfig).preferWasm, undefined);
      });

      it("should allow explicit override even on ARM64 Linux", async () => {
        const resolvedConfig = await resolveSolidityUserConfig(
          {
            solidity: {
              compilers: [
                { version: "0.8.28", preferWasm: false }, // Force native even without official build
                { version: "0.8.31", preferWasm: true }, // Force WASM even with official build
              ],
            },
          },
          otherResolvedConfig,
        );

        const compilers = resolvedConfig.solidity.profiles.default.compilers;
        assert.equal((compilers[0] as SolcConfig).preferWasm, false);
        assert.equal((compilers[1] as SolcConfig).preferWasm, true);
      });
    },
  );

  describe(
    "non-ARM64 platform per-compiler preferWasm defaults",
    {
      skip: missesSomeOfficialNativeBuilds(),
    },
    () => {
      const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

      it("should leave preferWasm undefined when not on ARM64 Linux", async () => {
        const resolvedConfig = await resolveSolidityUserConfig(
          {
            solidity: {
              compilers: [{ version: "0.8.28" }, { version: "0.8.31" }],
            },
          },
          otherResolvedConfig,
        );

        const compilers = resolvedConfig.solidity.profiles.default.compilers;
        assert.equal((compilers[0] as SolcConfig).preferWasm, undefined);
        assert.equal((compilers[1] as SolcConfig).preferWasm, undefined);
      });
    },
  );

  describe("config resolution with type discriminator", () => {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("should resolve compiler entry without type with type undefined (backward compat)", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ version: "0.8.28" }],
          },
        },
        otherResolvedConfig,
      );

      const compiler = resolvedConfig.solidity.profiles.default.compilers[0];
      assert.equal(compiler.type, undefined);
      // Should still be a SolcConfig with preferWasm field
      assert.ok(
        "preferWasm" in compiler,
        "Compiler without type should resolve as SolcConfig with preferWasm",
      );
    });

    it("should resolve compiler entry with type 'solc' as SolcConfig with preferWasm", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ type: "solc", version: "0.8.28" }],
          },
        },
        otherResolvedConfig,
      );

      const compiler = resolvedConfig.solidity.profiles.default.compilers[0];
      assert.equal(compiler.type, "solc");
      assert.ok(
        "preferWasm" in compiler,
        "Compiler with type 'solc' should resolve as SolcConfig with preferWasm",
      );
    });

    it("should resolve compiler entry with non-solc type WITHOUT preferWasm", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ type: "solx", version: "0.8.28" }],
          },
        },
        otherResolvedConfig,
      );

      const compiler = resolvedConfig.solidity.profiles.default.compilers[0];
      assert.equal(compiler.type, "solx");
      assert.ok(
        !("preferWasm" in compiler),
        "Compiler with non-solc type should NOT have preferWasm field",
      );
    });
  });

  describe("copyFromDefault preserves type field", () => {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("should preserve type on auto-generated production profile", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ type: "solx", version: "0.8.28" }],
          },
        },
        otherResolvedConfig,
      );

      const prodCompiler =
        resolvedConfig.solidity.profiles.production.compilers[0];
      assert.equal(
        prodCompiler.type,
        "solx",
        "Production profile should inherit type from default",
      );
    });

    it("should preserve type on auto-generated production profile (single version config)", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            type: "solx",
            version: "0.8.28",
          } as any,
        },
        otherResolvedConfig,
      );

      const prodCompiler =
        resolvedConfig.solidity.profiles.production.compilers[0];
      assert.equal(
        prodCompiler.type,
        "solx",
        "Production profile should inherit type from single-version default",
      );
    });
  });

  describe("backward compatibility", () => {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("should resolve an existing multi-version config identically (no type field)", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            compilers: [{ version: "0.8.24" }, { version: "0.8.28" }],
            overrides: {
              "contracts/Special.sol": { version: "0.8.26" },
            },
          },
        },
        otherResolvedConfig,
      );

      const defaultProfile = resolvedConfig.solidity.profiles.default;
      assert.equal(defaultProfile.compilers.length, 2);
      assert.equal(defaultProfile.compilers[0].version, "0.8.24");
      assert.equal(defaultProfile.compilers[0].type, undefined);
      assert.equal(defaultProfile.compilers[1].version, "0.8.28");
      assert.equal(defaultProfile.compilers[1].type, undefined);
      assert.equal(
        defaultProfile.overrides["contracts/Special.sol"].version,
        "0.8.26",
      );
      assert.equal(
        defaultProfile.overrides["contracts/Special.sol"].type,
        undefined,
      );
      // SolcConfig fields should be present
      assert.ok(
        "preferWasm" in defaultProfile.compilers[0],
        "Existing configs should still resolve with preferWasm",
      );
    });

    it("should resolve a simple version string config identically", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        { solidity: "0.8.28" },
        otherResolvedConfig,
      );

      const defaultProfile = resolvedConfig.solidity.profiles.default;
      assert.equal(defaultProfile.compilers.length, 1);
      assert.equal(defaultProfile.compilers[0].version, "0.8.28");
      assert.equal(defaultProfile.compilers[0].type, undefined);
      assert.ok(
        "preferWasm" in defaultProfile.compilers[0],
        "Existing configs should still resolve with preferWasm",
      );
      // Production profile should also exist
      assert.ok(
        "production" in resolvedConfig.solidity.profiles,
        "Production profile should exist",
      );
    });

    it("should resolve a build profiles config identically", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.8.24" }, { version: "0.8.28" }],
              },
              production: {
                version: "0.8.28",
                isolated: true,
              },
            },
          },
        },
        otherResolvedConfig,
      );

      const defaultProfile = resolvedConfig.solidity.profiles.default;
      const prodProfile = resolvedConfig.solidity.profiles.production;
      assert.equal(defaultProfile.compilers.length, 2);
      assert.equal(defaultProfile.compilers[0].type, undefined);
      assert.equal(prodProfile.compilers[0].version, "0.8.28");
      assert.equal(prodProfile.isolated, true);
    });
  });
});

describe("isSolcConfig type guard", () => {
  it("should return true for config with undefined type", () => {
    const config: SolidityCompilerConfig = {
      type: undefined,
      version: "0.8.28",
      settings: {},
    };
    assert.equal(isSolcConfig(config), true);
  });

  it("should return true for config with type 'solc'", () => {
    const config: SolidityCompilerConfig = {
      type: "solc",
      version: "0.8.28",
      settings: {},
    };
    assert.equal(isSolcConfig(config), true);
  });

  it("should return false for config with non-solc type", () => {
    const config: SolidityCompilerConfig = {
      type: "solx",
      version: "0.8.28",
      settings: {},
    };
    assert.equal(isSolcConfig(config), false);
  });
});
