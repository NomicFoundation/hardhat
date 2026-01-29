/* eslint-disable @typescript-eslint/consistent-type-assertions -- test*/
import assert from "node:assert/strict";
import os from "node:os";
import { describe, it } from "node:test";

import {
  hasOfficialArm64Build,
  resolveSolidityUserConfig,
  shouldUseWasm,
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
      assert.equal(compilers[0].preferWasm, true);
      assert.equal(compilers[1].preferWasm, false);
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
      assert.equal(overrides["contracts/Special.sol"].preferWasm, true);
    });
  });

  describe("ARM64 Linux per-compiler preferWasm defaults", {
    skip: !(os.platform() === "linux" && os.arch() === "arm64"),
  }, () => {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("should default preferWasm to true for versions without official ARM64 builds", async () => {
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

      const compilers = resolvedConfig.solidity.profiles.default.compilers;
      assert.equal(compilers[0].preferWasm, true);
      assert.equal(compilers[1].preferWasm, true);
    });

    it("should default preferWasm to false for versions with official ARM64 builds", async () => {
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

      const compilers = resolvedConfig.solidity.profiles.default.compilers;
      assert.equal(compilers[0].preferWasm, false);
      assert.equal(compilers[1].preferWasm, false);
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
      assert.equal(compilers[0].preferWasm, false);
      assert.equal(compilers[1].preferWasm, true);
    });
  });

  describe("non-ARM64 platform per-compiler preferWasm defaults", {
    skip: os.platform() === "linux" && os.arch() === "arm64",
  }, () => {
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
      assert.equal(compilers[0].preferWasm, undefined);
      assert.equal(compilers[1].preferWasm, undefined);
    });
  });

  describe("hasOfficialArm64Build", () => {
    it("returns false for versions before 0.8.31", () => {
      assert.equal(hasOfficialArm64Build("0.5.0"), false);
      assert.equal(hasOfficialArm64Build("0.8.0"), false);
      assert.equal(hasOfficialArm64Build("0.8.28"), false);
      assert.equal(hasOfficialArm64Build("0.8.30"), false);
    });

    it("returns true for 0.8.31 and later", () => {
      assert.equal(hasOfficialArm64Build("0.8.31"), true);
      assert.equal(hasOfficialArm64Build("0.8.32"), true);
      assert.equal(hasOfficialArm64Build("0.9.0"), true);
      assert.equal(hasOfficialArm64Build("1.0.0"), true);
    });
  });
});
