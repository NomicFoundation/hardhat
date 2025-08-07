import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateSolidityUserConfig } from "../../../../src/internal/builtin-plugins/solidity/config.js";

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
            message: "Expected boolean, received string",
            path: ["solidity", "isolated"],
          },
          {
            message: "Expected string, received number",
            path: ["solidity", "version"],
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
            message: "Expected boolean, received string",
            path: ["solidity", "profiles", "default", "isolated"],
          },
          {
            message: "Expected string, received number",
            path: ["solidity", "profiles", "default", "version"],
          },
          {
            message: "Expected boolean, received string",
            path: ["solidity", "profiles", "production", "isolated"],
          },
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "profiles", "production", "compilers"],
          },
          {
            message: "This field is incompatible with `version`",
            path: ["solidity", "profiles", "production", "overrides"],
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
});

describe("solidity plugin config resolution", () => {
  it.todo("should resolve a config with a single version string", () => {});

  it.todo("should resolve a config with multiple version strings", () => {});

  it.todo("should resolve a SingleVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a MultiVersionSolidityUserConfig value", () => {});

  it.todo("should resolve a BuildProfilesSolidityUserConfig value", () => {});
});
