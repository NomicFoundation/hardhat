import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHardhatConfigPath } from "../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../src/hre.js";
import { builtinPlugins } from "../../src/internal/builtin-plugins/index.js";
import {
  getHardhatRuntimeEnvironmentSingleton,
  resetHardhatRuntimeEnvironmentSingleton,
} from "../../src/internal/hre-singleton.js";
import { useFixtureProject } from "../helpers/project.js";
import { HardhatError } from "@ignored/hardhat-vnext-errors";

describe("HRE", () => {
  describe("createHardhatRuntimeEnvironment", () => {
    it("should include the built-in plugins", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assert.deepEqual(hre.config.plugins, builtinPlugins);

      resetHardhatRuntimeEnvironmentSingleton();
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

      resetHardhatRuntimeEnvironmentSingleton();
    });
  });

  describe("config loading", () => {
    describe("resolveConfigPath", async () => {
      it("should return the HARDHAT_CONFIG env variable if it is set", async () => {
        process.env.HARDHAT_CONFIG = "env.config.js";

        assert.equal(await resolveHardhatConfigPath(), "env.config.js");

        delete process.env.HARDHAT_CONFIG;
      });

      it("should throw if the config file is not found", async () => {
        await assert.rejects(
          resolveHardhatConfigPath(),
          new HardhatError(HardhatError.ERRORS.GENERAL.NO_CONFIG_FILE_FOUND),
        );
      });

      describe("javascript config", () => {
        describe("current dir", () => {
          useFixtureProject("config-js");

          it("should load a config file in the current directory", async () => {
            const configPath = await resolveHardhatConfigPath();

            assert(
              configPath.endsWith("hardhat.config.js"),
              `expected configPath to end with hardhat.config.js, but got ${configPath}`,
            );
          });
        });

        describe("nested dir", () => {
          useFixtureProject("config-js", "nested-folder");

          it("should load a config file in the parent directory", async () => {
            const configPath = await resolveHardhatConfigPath();

            assert(
              configPath.endsWith("hardhat.config.js"),
              `expected configPath to end with hardhat.config.js, but got ${configPath}`,
            );
          });
        });
      });

      describe("typescript config", () => {
        describe("current dir", () => {
          useFixtureProject("config-ts");

          it("should load a config file in the current directory", async () => {
            const configPath = await resolveHardhatConfigPath();

            assert(
              configPath.endsWith("hardhat.config.ts"),
              `expected configPath to end with hardhat.config.js, but got ${configPath}`,
            );
          });
        });

        describe("nested dir", () => {
          useFixtureProject("config-ts", "nested-folder");

          it("should load a config file in the parent directory", async () => {
            const configPath = await resolveHardhatConfigPath();

            assert(
              configPath.endsWith("hardhat.config.ts"),
              `expected configPath to end with hardhat.config.js, but got ${configPath}`,
            );
          });
        });
      });
    });

    describe("programmatic API", () => {
      useFixtureProject("loaded-config");

      it("should load the config file", async () => {
        const hre = await import("../../src/index.js");

        assert.deepEqual(hre.config.plugins, [{ id: "test-plugin" }]);

        resetHardhatRuntimeEnvironmentSingleton();
      });
    });
  });
});
