/* eslint-disable @typescript-eslint/consistent-type-assertions -- test*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

    it.todo("Should reject invalid SingleVersionSolidityUserConfig values");

    it.todo("Should reject invalid MultiVersionSolidityUserConfig values");

    it.todo("Should reject invalid BuildProfilesSolidityUserConfig values");

    it("Should accept solidity version strings", () => {
      assert.deepEqual(validateSolidityUserConfig({ solidity: "0.8.0" }), []);
    });

    it("Should accept an array of solidity version strings", () => {
      assert.deepEqual(
        validateSolidityUserConfig({ solidity: ["0.8.0", "0.8.1"] }),
        [],
      );
    });

    it.todo("Should accept a SingleVersionSolidityUserConfig value");

    it.todo("Should accept a MultiVersionSolidityUserConfig value");

    it.todo("Should accept a BuildProfilesSolidityUserConfig value");
  });
});

describe("solidity plugin config resolution", () => {
  it.todo("should resolve a config with a single version string", () => {});

  it.todo("should resolve a config with multiple version strings", () => {});

  it.todo("should resolve a SingleVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a MultiVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a BuildProfilesSolidityUserConfig value", () => {});

  describe("preferWasm setting resolution", function () {
    const otherResolvedConfig = { paths: { root: process.cwd() } } as any;

    it("resolves to true when build profile is production and is not specified in the config", async () => {
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

      assert.equal(
        resolvedConfig.solidity.profiles.production.preferWasm,
        true,
      );
    });

    it("resolves to true when build profile is production and is specified, but preferWasm is not set", async () => {
      const resolvedConfig = await resolveSolidityUserConfig(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                preferWasm: false,
              },
              production: {
                version: "0.8.28",
              },
            },
          },
        },
        otherResolvedConfig,
      );

      assert.equal(
        resolvedConfig.solidity.profiles.production.preferWasm,
        true,
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
              production: {
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
      assert.equal(
        resolvedConfig.solidity.profiles.production.preferWasm,
        true,
      );
    });
  });
});
