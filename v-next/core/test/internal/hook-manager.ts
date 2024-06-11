import type {
  ConfigurationVariable,
  HardhatConfig,
  HardhatUserConfig,
} from "../../src/types/config.js";
import type { HookContext, HookManager } from "../../src/types/hooks.js";

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { HookManagerImplementation } from "../../src/internal/hook-manager.js";
import { UserInterruptionManagerImplementation } from "../../src/internal/user-interruptions.js";

describe("HookManager", () => {
  describe("runHandlerChain", () => {
    let hookManager: HookManager;

    beforeEach(() => {
      const manager = new HookManagerImplementation([]);

      const userInterruptionsManager =
        new UserInterruptionManagerImplementation(hookManager);

      manager.setContext({
        config: {
          tasks: [],
          plugins: [],
        },
        hooks: hookManager,
        globalArguments: {},
        interruptions: userInterruptionsManager,
      });

      hookManager = manager;
    });

    it("should return the default implementation if no other handlers are provided", async () => {
      const notExpectedConfig = {};

      const defaultImplementationVersionOfConfig: HardhatConfig = {
        plugins: [],
        tasks: [],
      };

      const resultConfig = await hookManager.runHandlerChain(
        "config",
        "extendUserConfig",
        [notExpectedConfig],
        async () => {
          return defaultImplementationVersionOfConfig;
        },
      );

      assert.equal(resultConfig, defaultImplementationVersionOfConfig);
    });

    it("should run the handlers as a chain finishing with the default implementation", async () => {
      const sequence: string[] = [];

      hookManager.registerHandlers("config", {
        extendUserConfig: async (
          config: HardhatUserConfig,
          next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
        ) => {
          sequence.push("first:before");
          const newConfig = await next(config);
          sequence.push("first:after");

          return newConfig;
        },
      });

      hookManager.registerHandlers("config", {
        extendUserConfig: async (
          config: HardhatUserConfig,
          next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
        ) => {
          sequence.push("second:before");
          const newConfig = await next(config);
          sequence.push("second:after");

          return newConfig;
        },
      });

      hookManager.registerHandlers("config", {
        extendUserConfig: async (
          config: HardhatUserConfig,
          next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
        ) => {
          sequence.push("third:before");
          const newConfig = await next(config);
          sequence.push("third:after");

          return newConfig;
        },
      });

      await hookManager.runHandlerChain(
        "config",
        "extendUserConfig",
        [{}],
        async () => {
          sequence.push("default");
          return {};
        },
      );

      assert.deepEqual(sequence, [
        "third:before",
        "second:before",
        "first:before",
        "default",
        "first:after",
        "second:after",
        "third:after",
      ]);
    });

    it("should pass the parameters directly for config hooks", async () => {
      const expectedConfig: HardhatConfig = {
        plugins: [],
        tasks: [],
      };

      hookManager.registerHandlers("config", {
        extendUserConfig: async (
          config: HardhatUserConfig,
          next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
        ) => {
          assert.equal(
            config,
            expectedConfig,
            "the param passed to runHandlerChain should be object equal with the param passed to the handlers",
          );

          const newConfig = await next(config);

          return newConfig;
        },
      });

      const resultConfig = await hookManager.runHandlerChain(
        "config",
        "extendUserConfig",
        [expectedConfig],
        async (c) => {
          assert.equal(
            c,
            expectedConfig,
            "the param passed through the next hierarchy should be object equal with the param passed to the default implementation",
          );

          return c;
        },
      );

      assert.equal(resultConfig, expectedConfig);
    });

    it("should pass the parameters with hook context for non-config hooks", async () => {
      const exampleConfigVar: ConfigurationVariable = {
        _type: "ConfigurationVariable",
        name: "example",
      };

      hookManager.registerHandlers("configurationVariables", {
        fetchValue: async (
          context: HookContext,
          variable: ConfigurationVariable,
          next: (
            nextContext: HookContext,
            nextVariable: ConfigurationVariable,
          ) => Promise<string>,
        ) => {
          assert(
            context !== null && typeof context === "object",
            "Hook Context should be an object",
          );

          assert.equal(
            variable,
            exampleConfigVar,
            "the param passed to runHandlerChain should be object equal with the param passed to the handlers",
          );

          const newValue = await next(context, variable);

          return newValue;
        },
      });

      const resultValue = await hookManager.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [exampleConfigVar],
        async (context, configVar) => {
          assert(
            context !== null && typeof context === "object",
            "Hook Context should be an object",
          );

          assert.equal(
            configVar,
            exampleConfigVar,
            "the param passed through the next hierarchy should be object equal with the param passed to the default implementation",
          );

          return "default-value";
        },
      );

      assert.equal(resultValue, "default-value");
    });
  });
});
