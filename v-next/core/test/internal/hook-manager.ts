/* eslint-disable @typescript-eslint/consistent-type-assertions -- the sequential
   tests require casting - see the `runSequentialHandlers` describe */
import type {
  ConfigurationVariable,
  HardhatConfig,
  HardhatUserConfig,
} from "../../src/types/config.js";
import type {
  ConfigHooks,
  HardhatRuntimeEnvironmentHooks as HreHooks,
  HardhatUserConfigValidationError,
  HookContext,
  HookManager,
  HardhatHooks,
} from "../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../src/types/hre.js";
import type { HardhatPlugin } from "../../src/types/plugins.js";
import type { Task, TaskManager } from "../../src/types/tasks.js";
import type { UserInterruptionManager } from "../../src/types/user-interruptions.js";

import assert from "node:assert/strict";
import { describe, it, beforeEach, before } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { resolveProjectRoot } from "../../src/index.js";
import { HookManagerImplementation } from "../../src/internal/hook-manager.js";
import { UserInterruptionManagerImplementation } from "../../src/internal/user-interruptions.js";

describe("HookManager", () => {
  let projectRoot: string;

  before(async () => {
    projectRoot = await resolveProjectRoot(process.cwd());
  });

  describe("plugin hooks", () => {
    describe("running", () => {
      let hookManager: HookManager;
      let sequence: string[];

      beforeEach(() => {
        sequence = [];

        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: async () => {
              const handlers: Partial<ConfigHooks> = {
                validateUserConfig: async (
                  _config: HardhatUserConfig,
                ): Promise<HardhatUserConfigValidationError[]> => {
                  return [
                    {
                      path: [],
                      message: "FromPlugin",
                    },
                  ];
                },
                extendUserConfig: async (
                  config: HardhatUserConfig,
                  next: (
                    nextConfig: HardhatUserConfig,
                  ) => Promise<HardhatUserConfig>,
                ) => {
                  sequence.push("FromPlugin:before");
                  const newConfig = await next(config);
                  sequence.push("FromPlugin:after");

                  return newConfig;
                },
              };

              return handlers;
            },
            hre: async () => {
              const handlers = {
                testExample: async (
                  _context: HookContext,
                  _input: string,
                ): Promise<string> => {
                  return "FromPlugin";
                },
              } as Partial<HreHooks>;

              return handlers;
            },
          },
        };

        const manager = new HookManagerImplementation(projectRoot, [
          examplePlugin,
        ]);

        const userInterruptionsManager =
          new UserInterruptionManagerImplementation(hookManager);

        manager.setContext({
          config: {
            tasks: [],
            plugins: [],
            paths: {
              root: projectRoot,
              cache: "",
              artifacts: "",
              tests: "",
            },
          },
          hooks: hookManager,
          globalOptions: {},
          interruptions: userInterruptionsManager,
        });

        hookManager = manager;
      });

      it("should use plugins during handler runs", async () => {
        hookManager.registerHandlers("config", {
          extendUserConfig: async (
            config: HardhatUserConfig,
            next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
          ) => {
            sequence.push("FromHandler:before");
            const newConfig = await next(config);
            sequence.push("FromHandler:after");

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
          "FromHandler:before",
          "FromPlugin:before",
          "default",
          "FromPlugin:after",
          "FromHandler:after",
        ]);
      });

      it("Should use plugins during a sequential run", async () => {
        hookManager.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "FromHandler";
          },
        } as Partial<HardhatHooks["hre"]>);

        const result = await hookManager.runSequentialHandlers(
          "hre",
          "testExample" as any,
          ["input"],
        );

        assert.deepEqual(result, ["FromHandler", "FromPlugin"]);
      });

      it("should use plugins during parallel handlers runs", async () => {
        const originalConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        hookManager.registerHandlers("config", {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "FromRegisteredHandler",
              },
            ];
          },
        });

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [originalConfig],
        );

        assert.deepEqual(results, [
          [
            {
              path: [],
              message: "FromRegisteredHandler",
            },
          ],
          [
            {
              path: [],
              message: "FromPlugin",
            },
          ],
        ]);
      });
    });

    describe("loading", () => {
      it("should load hook from file", async () => {
        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: import.meta.resolve("./fixture-plugins/config-plugin.js"),
          },
        };

        const expectedConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        const manager = new HookManagerImplementation(projectRoot, [
          examplePlugin,
        ]);

        const validationResult = await manager.runSequentialHandlers(
          "config",
          "validateUserConfig",
          [expectedConfig],
        );

        assert.deepEqual(validationResult, [
          [
            {
              message: "FromLoadedPlugin",
              path: [],
            },
          ],
        ]);
      });

      it("should throw if a plugin can't be loaded from file", async () => {
        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: import.meta.resolve("./non-existant.js"),
          },
        };

        const manager = new HookManagerImplementation(projectRoot, [
          examplePlugin,
        ]);

        try {
          await manager.runHandlerChain(
            "config",
            "extendUserConfig",
            [{}],
            async () => {
              return {};
            },
          );
        } catch (error) {
          ensureError(error);
          assert.ok("code" in error, "Error has no code property");
          assert.equal(error.code, "ERR_MODULE_NOT_FOUND");
          return;
        }

        assert.fail("Expected an error, but none was thrown");
      });

      it("should throw if a non-filepath is given to the plugin being loaded", async () => {
        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: "./fixture-plugins/config-plugin.js", // this is not a `file://` URL
          },
        };

        const manager = new HookManagerImplementation(projectRoot, [
          examplePlugin,
        ]);

        await assertRejectsWithHardhatError(
          async () =>
            manager.runHandlerChain(
              "config",
              "extendUserConfig",
              [{}],
              async () => {
                return {};
              },
            ),
          HardhatError.ERRORS.HOOKS.INVALID_HOOK_FACTORY_PATH,
          {
            hookCategoryName: "config",
            pluginId: "example",
            path: "./fixture-plugins/config-plugin.js",
          },
        );
      });
    });
  });

  describe("dynamic hooks", () => {
    describe("runHandlerChain", () => {
      let hookManager: HookManager;

      beforeEach(() => {
        const manager = new HookManagerImplementation(projectRoot, []);

        const userInterruptionsManager =
          new UserInterruptionManagerImplementation(hookManager);

        manager.setContext({
          config: {
            tasks: [],
            plugins: [],
            paths: {
              root: projectRoot,
              cache: "",
              artifacts: "",
              tests: "",
            },
          },
          hooks: hookManager,
          globalOptions: {},
          interruptions: userInterruptionsManager,
        });

        hookManager = manager;
      });

      it("should return the default implementation if no other handlers are provided", async () => {
        const notExpectedConfig = {};

        const defaultImplementationVersionOfConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
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
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
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

    /**
     * To fully test sequential handlers we need to go beyond the current type.
     * Because we are unwilling to leak the type into production we are casting
     * as if the following type had been declared:
     *
     * ```ts
     *  declare module "../../src/types/hooks.js" {
     *    interface HardhatRuntimeEnvironmentHooks {
     *      testExample: (context: HookContext, input: string) => Promise<string>;
     *    }
     *  }
     */
    describe("runSequentialHandlers", () => {
      let hookManager: HookManager;

      beforeEach(() => {
        const manager = new HookManagerImplementation(projectRoot, []);

        const userInterruptionsManager =
          new UserInterruptionManagerImplementation(hookManager);

        manager.setContext({
          config: {
            tasks: [],
            plugins: [],
            paths: {
              root: projectRoot,
              cache: "",
              artifacts: "",
              tests: "",
            },
          },
          hooks: hookManager,
          globalOptions: {},
          interruptions: userInterruptionsManager,
        });

        hookManager = manager;
      });

      it("Should return the empty set if no handlers are registered", async () => {
        const mockHre = buildMockHardhatRuntimeEnvironment(
          projectRoot,
          hookManager,
        );

        const resultHre = await hookManager.runSequentialHandlers(
          "hre",
          "created",
          [mockHre],
        );

        assert.deepEqual(resultHre, []);
      });

      it("Should return a return entry per handler", async () => {
        hookManager.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "first";
          },
        } as Partial<HardhatHooks["hre"]>);

        hookManager.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "second";
          },
        } as Partial<HardhatHooks["hre"]>);

        hookManager.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "third";
          },
        } as Partial<HardhatHooks["hre"]>);

        const result = await hookManager.runSequentialHandlers(
          "hre",
          "testExample" as keyof HardhatHooks["hre"],
          ["input"] as any,
        );

        assert.deepEqual(result, ["third", "second", "first"]);
      });

      it("Should let handlers access the passed context (for non-config hooks)", async () => {
        hookManager.registerHandlers("hre", {
          testExample: async (
            context: HookContext,
            input: string,
          ): Promise<string> => {
            assert(
              context !== null && typeof context === "object",
              "Context should be passed for sequential processing",
            );
            assert.equal(input, "input");
            return "result";
          },
        } as Partial<HardhatHooks["hre"]>);

        const result = await hookManager.runSequentialHandlers(
          "hre",
          "testExample" as any,
          ["input"],
        );

        assert.deepEqual(result, ["result"]);
      });

      it("Should stop config handlers having access to the hook context", async () => {
        const expectedConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        hookManager.registerHandlers("config", {
          validateUserConfig: async (
            config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            assert.deepEqual(
              config,
              expectedConfig,
              "The first parameter should be the config - not the context",
            );

            return [];
          },
        });

        const validationResult = await hookManager.runSequentialHandlers(
          "config",
          "validateUserConfig",
          [expectedConfig],
        );

        assert.deepEqual(validationResult, [[]]);
      });
    });

    describe("runParallelHandlers", () => {
      let hookManager: HookManager;

      beforeEach(() => {
        const manager = new HookManagerImplementation(projectRoot, []);

        const userInterruptionsManager =
          new UserInterruptionManagerImplementation(hookManager);

        manager.setContext({
          config: {
            tasks: [],
            plugins: [],
            paths: {
              root: projectRoot,
              cache: "",
              artifacts: "",
              tests: "",
            },
          },
          hooks: hookManager,
          globalOptions: {},
          interruptions: userInterruptionsManager,
        });

        hookManager = manager;
      });

      it("Should return an empty result set if no handlers are provided", async () => {
        const originalConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [originalConfig],
        );

        assert.deepEqual(results, []);
      });

      it("Should return a result per handler", async () => {
        const originalConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        hookManager.registerHandlers("config", {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "first",
              },
            ];
          },
        });

        hookManager.registerHandlers("config", {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "second",
              },
            ];
          },
        });

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [originalConfig],
        );

        assert.deepEqual(results, [
          [
            {
              path: [],
              message: "second",
            },
          ],
          [
            {
              path: [],
              message: "first",
            },
          ],
        ]);
      });

      it("Should pass the context to the handler (for non-config)", async () => {
        const mockHre = buildMockHardhatRuntimeEnvironment(
          projectRoot,
          hookManager,
        );

        hookManager.registerHandlers("hre", {
          created: async (
            context: HookContext,
            hre: HardhatRuntimeEnvironment,
          ): Promise<void> => {
            assert(
              context !== null && typeof context === "object",
              "hook context should be passed",
            );
            assert.equal(hre, mockHre);
          },
        });

        const result = await hookManager.runParallelHandlers("hre", "created", [
          mockHre,
        ]);

        assert.deepEqual(result, [undefined]);
      });

      it("Should not pass the hook context for config", async () => {
        const expectedConfig: HardhatConfig = {
          plugins: [],
          tasks: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        };

        const validationError = {
          path: [],
          message: "first",
        };

        hookManager.registerHandlers("config", {
          validateUserConfig: async (
            config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            assert.equal(config, expectedConfig);
            return [validationError];
          },
        });

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [expectedConfig],
        );

        assert.deepEqual(results, [[validationError]]);
      });
    });

    describe("unregisterHandlers", () => {
      let hookManager: HookManager;

      beforeEach(() => {
        const manager = new HookManagerImplementation(projectRoot, []);

        const userInterruptionsManager =
          new UserInterruptionManagerImplementation(hookManager);

        manager.setContext({
          config: {
            tasks: [],
            plugins: [],
            paths: {
              root: projectRoot,
              cache: "",
              artifacts: "",
              tests: "",
            },
          },
          hooks: hookManager,
          globalOptions: {},
          interruptions: userInterruptionsManager,
        });

        hookManager = manager;
      });

      it("Should unhook a handler", async () => {
        const hookCategory = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [];
          },
        };

        hookManager.registerHandlers("config", hookCategory);

        hookManager.unregisterHandlers("config", hookCategory);

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [
            {
              plugins: [],
              tasks: [],
            },
          ],
        );

        // no responses should be returned
        assert.deepEqual(results, []);
      });

      it("Should only unhook the right handler", async () => {
        const firstHook = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "first",
              },
            ];
          },
        };

        const secondHook = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "second",
              },
            ];
          },
        };

        const thirdHook = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [
              {
                path: [],
                message: "third",
              },
            ];
          },
        };

        // Arrange
        hookManager.registerHandlers("config", firstHook);
        hookManager.registerHandlers("config", secondHook);
        hookManager.registerHandlers("config", thirdHook);

        // Act
        hookManager.unregisterHandlers("config", secondHook);

        const results = await hookManager.runParallelHandlers(
          "config",
          "validateUserConfig",
          [
            {
              plugins: [],
              tasks: [],
            },
          ],
        );

        // Assert
        assert.deepEqual(results, [
          [
            {
              path: [],
              message: "third",
            },
          ],
          [
            {
              path: [],
              message: "first",
            },
          ],
        ]);
      });

      it("Should not throw if there are no handlers to unhook for the category", async () => {
        const exampleHook = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [];
          },
        };

        hookManager.unregisterHandlers("config", exampleHook);
      });
    });
  });
});

function buildMockHardhatRuntimeEnvironment(
  projectRoot: string,
  hookManager: HookManager,
): HardhatRuntimeEnvironment {
  const mockInteruptionManager: UserInterruptionManager = {
    displayMessage: async () => {},
    requestInput: async () => "",
    requestSecretInput: async () => "",
    uninterrupted: async <ReturnT>(
      f: () => ReturnT,
    ): Promise<Awaited<ReturnT>> => {
      /* eslint-disable-next-line @typescript-eslint/return-await, @typescript-eslint/await-thenable -- this is following the pattern in the real implementation */
      return await f();
    },
  };

  const mockTaskManager: TaskManager = {
    getTask: () => {
      throw new Error("Method not implemented.");
    },
    rootTasks: new Map<string, Task>(),
  };

  const mockHre: HardhatRuntimeEnvironment = {
    hooks: hookManager,
    config: {
      tasks: [],
      plugins: [],
      paths: {
        root: projectRoot,
        cache: "",
        artifacts: "",
        tests: "",
      },
    },
    tasks: mockTaskManager,
    globalOptions: {},
    interruptions: mockInteruptionManager,
  };

  return mockHre;
}
