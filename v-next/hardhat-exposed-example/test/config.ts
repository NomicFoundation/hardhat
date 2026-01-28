import type { HardhatConfig, HardhatUserConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  resolvePluginConfig,
  validatePluginConfig,
} from "../src/internal/config.js";

describe("Config", () => {
  describe("validatePluginConfig", () => {
    it("should return empty array for valid config with no exposedContracts path", async () => {
      const userConfig: HardhatUserConfig = {};

      const errors = await validatePluginConfig(userConfig);

      assert.deepEqual(errors, []);
    });

    it("should return empty array for valid config with string exposedContracts path", async () => {
      const userConfig: HardhatUserConfig = {
        paths: {
          exposedContracts: "my-exposed-contracts",
        },
      };

      const errors = await validatePluginConfig(userConfig);

      assert.deepEqual(errors, []);
    });

    it("should return error when exposedContracts is not a string", async () => {
      // Testing runtime validation with invalid config
      const userConfig = {
        paths: {
          exposedContracts: 123,
        },
      };

      // @ts-expect-error - testing invalid config at runtime
      const errors = await validatePluginConfig(userConfig);

      assert.equal(errors.length, 1);
      assert.deepEqual(errors[0].path, ["paths", "exposedContracts"]);
      assert.equal(errors[0].message, "Expected an optional string.");
    });
  });

  describe("resolvePluginConfig", () => {
    /**
     * Creates a minimal config object for testing resolvePluginConfig.
     * Only includes the paths needed by the function under test.
     */
    function createPartiallyResolvedConfig(
      root: string,
      soliditySources: string[] = [],
    ): HardhatConfig {
      const partialConfig = {
        paths: {
          root,
          sources: {
            solidity: soliditySources,
          },
        },
      };
      // @ts-expect-error - minimal config for testing, only paths are used
      return partialConfig;
    }

    it("should use default path when exposedContracts not specified", async () => {
      const userConfig: HardhatUserConfig = {};
      const partialConfig = createPartiallyResolvedConfig("/project");

      const result = await resolvePluginConfig(userConfig, partialConfig);

      assert.equal(
        result.paths.exposedContracts,
        path.resolve("/project", "exposed-contracts"),
      );
    });

    it("should resolve relative path to absolute", async () => {
      const userConfig: HardhatUserConfig = {
        paths: {
          exposedContracts: "custom-exposed",
        },
      };
      const partialConfig = createPartiallyResolvedConfig("/project");

      const result = await resolvePluginConfig(userConfig, partialConfig);

      assert.equal(
        result.paths.exposedContracts,
        path.resolve("/project", "custom-exposed"),
      );
    });

    it("should keep absolute path as-is", async () => {
      const absolutePath = "/absolute/path/to/exposed";
      const userConfig: HardhatUserConfig = {
        paths: {
          exposedContracts: absolutePath,
        },
      };
      const partialConfig = createPartiallyResolvedConfig("/project");

      const result = await resolvePluginConfig(userConfig, partialConfig);

      assert.equal(result.paths.exposedContracts, absolutePath);
    });

    it("should not modify solidity sources", async () => {
      // The plugin uses next-first pattern, so exposed contracts are built
      // separately and don't need to be in solidity sources
      const userConfig: HardhatUserConfig = {};
      const partialConfig = createPartiallyResolvedConfig("/project", [
        "/project/contracts",
      ]);

      const result = await resolvePluginConfig(userConfig, partialConfig);

      // solidity sources should be unchanged
      assert.deepEqual(result.paths.sources.solidity, ["/project/contracts"]);
    });
  });
});
