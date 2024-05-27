import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../src/hre.js";
import { builtinPlugins } from "../../src/internal/builtin-plugins/index.js";
import { resolveConfigPath } from "../../src/internal/helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "../../src/internal/hre-singleton.js";
import { useFixtureProject } from "../helpers/project.js";

describe("HRE", () => {
  describe("createHardhatRuntimeEnvironment", () => {
    it("should include the built-in plugins", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assert.deepEqual(hre.config.plugins, builtinPlugins);
    });
  });

  describe("getHardhatRuntimeEnvironmentSingleton", () => {
    it("should return the same instance", async () => {
      const hre1 = await getHardhatRuntimeEnvironmentSingleton({
        plugins: [{ id: "custom task" }],
      });
      const hre2 = await getHardhatRuntimeEnvironmentSingleton({});

      assert.deepEqual(
        hre1.config.plugins.find((p) => p.id === "custom task"),
        { id: "custom task" },
      );
      assert.deepEqual(
        hre2.config.plugins.find((p) => p.id === "custom task"),
        { id: "custom task" },
      );
      assert.deepEqual(hre1, hre2);
    });
  });

  describe("config loading", () => {
    describe("resolveConfigPath", async () => {
      it("should return the HARDHAT_CONFIG env variable if it is set", async () => {
        process.env.HARDHAT_CONFIG = "hardhat.config.js";

        assert.equal(await resolveConfigPath(), "hardhat.config.js");

        delete process.env.HARDHAT_CONFIG;
      });

      it("should throw if the config file is not found", async () => {
        await assert.rejects(resolveConfigPath(), {
          message: "No Hardhat config file found",
        });
      });

      describe("javascript config", () => {
        describe("current dir", () => {
          useFixtureProject("config-js");

          it("should load a config file in the current directory", async () => {
            const configPath = await resolveConfigPath();

            assert(configPath.endsWith("hardhat.config.js"));
          });
        });

        describe("nested dir", () => {
          useFixtureProject("config-js", "nested-folder");

          it("should load a config file in the parent directory", async () => {
            const configPath = await resolveConfigPath();

            assert(configPath.endsWith("hardhat.config.js"));
          });
        });
      });

      describe("typescript config", () => {
        describe("current dir", () => {
          useFixtureProject("config-ts");

          it("should load a config file in the current directory", async () => {
            const configPath = await resolveConfigPath();

            assert(configPath.endsWith("hardhat.config.ts"));
          });
        });

        describe("nested dir", () => {
          useFixtureProject("config-ts", "nested-folder");

          it("should load a config file in the parent directory", async () => {
            const configPath = await resolveConfigPath();

            assert(configPath.endsWith("hardhat.config.ts"));
          });
        });
      });
    });

    // This test works individually but fails when running all tests
    // due to the hre singleton being used in tests above.
    // ESM modules cache is not accessible like `require.cache` in CJS,
    // so a workaround is needed.
    // TODO: Fix this test
    describe.skip("programmatic API", () => {
      useFixtureProject("loaded-config");

      it("should load the config file", async () => {
        const hre = await import("../../src/index.js");

        assert.deepEqual(hre.config.plugins, [{ id: "test-plugin" }]);
      });
    });
  });
});
