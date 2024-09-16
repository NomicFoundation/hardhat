/* eslint-disable @typescript-eslint/consistent-type-assertions -- the
sequential tests require casting - see the `runSequentialHandlers` describe */

import type { HardhatUserConfig } from "../../../src/config.js";
import type { ConfigurationVariable } from "../../../src/types/config.js";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
  HookContext,
  HardhatHooks,
  HardhatRuntimeEnvironmentHooks,
} from "../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../src/types/hre.js";
import type { HardhatPlugin } from "../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it, beforeEach, before } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { HookManagerImplementation } from "../../../src/internal/core/hook-manager.js";
import {
  HardhatRuntimeEnvironmentImplementation,
  resolveProjectRoot,
} from "../../../src/internal/core/hre.js";

describe("HookManager", () => {
  let projectRoot: string;

  before(async () => {
    projectRoot = await resolveProjectRoot(process.cwd());
  });

  describe("plugin hooks", () => {
    describe("running", () => {
      let hre: HardhatRuntimeEnvironment;

      describe("runHandlerChain", () => {
        let sequence: string[];

        beforeEach(async () => {
          sequence = [];

          const examplePlugin: HardhatPlugin = {
            id: "example",
            hookHandlers: {
              config: async () => {
                const handlers: Partial<ConfigHooks> = {
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
            },
          };

          hre = await HardhatRuntimeEnvironmentImplementation.create(
            { plugins: [examplePlugin] },
            {},
          );
        });

        it("should use plugins during handler runs", async () => {
          hre.hooks.registerHandlers("config", {
            extendUserConfig: async (
              config: HardhatUserConfig,
              next: (
                nextConfig: HardhatUserConfig,
              ) => Promise<HardhatUserConfig>,
            ) => {
              sequence.push("FromHandler:before");
              const newConfig = await next(config);
              sequence.push("FromHandler:after");

              return newConfig;
            },
          });

          // We clear the sequense here, as we used the plugin already during the
          // initialization of the HRE
          sequence = [];

          await hre.hooks.runHandlerChain(
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
      });

      describe("runSequentialHandlers", () => {
        beforeEach(async () => {
          const examplePlugin: HardhatPlugin = {
            id: "example",
            hookHandlers: {
              hre: async () => {
                const handlers = {
                  testExample: async (
                    _context: HookContext,
                    _input: string,
                  ): Promise<string> => {
                    return "FromPlugin";
                  },
                } as Partial<HardhatRuntimeEnvironmentHooks>;

                return handlers;
              },
            },
          };

          hre = await HardhatRuntimeEnvironmentImplementation.create(
            { plugins: [examplePlugin] },
            {},
          );
        });

        it("Should use plugins during a sequential run", async () => {
          hre.hooks.registerHandlers("hre", {
            testExample: async (
              _context: HookContext,
              _input: string,
            ): Promise<string> => {
              return "FromHandler";
            },
          } as Partial<HardhatHooks["hre"]>);

          const result = await hre.hooks.runSequentialHandlers(
            "hre",
            "testExample" as any,
            ["input"],
          );

          assert.deepEqual(result, ["FromHandler", "FromPlugin"]);
        });
      });

      describe("runParallelHandlers", () => {
        let forceConfigValidationErrorFromPlugin: boolean;

        beforeEach(async () => {
          forceConfigValidationErrorFromPlugin = false;

          const examplePlugin: HardhatPlugin = {
            id: "example",
            hookHandlers: {
              config: async () => {
                const handlers: Partial<ConfigHooks> = {
                  validateUserConfig: async (
                    _config: HardhatUserConfig,
                  ): Promise<HardhatUserConfigValidationError[]> => {
                    if (forceConfigValidationErrorFromPlugin) {
                      return [
                        {
                          path: [],
                          message: "FromPlugin",
                        },
                      ];
                    }

                    return [];
                  },
                };

                return handlers;
              },
            },
          };

          hre = await HardhatRuntimeEnvironmentImplementation.create(
            { plugins: [examplePlugin] },
            {},
          );
        });

        it("should use plugins during parallel handlers runs", async () => {
          const originalConfig: HardhatUserConfig = {};

          hre.hooks.registerHandlers("config", {
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

          forceConfigValidationErrorFromPlugin = true;

          const results = await hre.hooks.runParallelHandlers(
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
    });

    describe("loading", () => {
      it("should load hook from file", async () => {
        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: import.meta.resolve("./fixture-plugins/config-plugin.js"),
          },
        };

        const expectedConfig: HardhatUserConfig = {};

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
    let hre: HardhatRuntimeEnvironment;

    beforeEach(async () => {
      hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});
    });

    describe("runHandlerChain", () => {
      it("should return the default implementation if no other handlers are provided", async () => {
        const notExpectedConfig = {};

        const defaultImplementationVersionOfConfig: HardhatUserConfig = {};

        const resultConfig = await hre.hooks.runHandlerChain(
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

        hre.hooks.registerHandlers("config", {
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

        hre.hooks.registerHandlers("config", {
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

        hre.hooks.registerHandlers("config", {
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

        await hre.hooks.runHandlerChain(
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
        const expectedConfig: HardhatUserConfig = {};

        hre.hooks.registerHandlers("config", {
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

        const resultConfig = await hre.hooks.runHandlerChain(
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

        hre.hooks.registerHandlers("configurationVariables", {
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

        const resultValue = await hre.hooks.runHandlerChain(
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
      it("Should return the empty set if no handlers are registered", async () => {
        const resultHreCreated = await hre.hooks.runSequentialHandlers(
          "hre",
          "created",
          [hre],
        );

        assert.deepEqual(resultHreCreated, []);
      });

      it("Should return a return entry per handler", async () => {
        hre.hooks.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "first";
          },
        } as Partial<HardhatHooks["hre"]>);

        hre.hooks.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "second";
          },
        } as Partial<HardhatHooks["hre"]>);

        hre.hooks.registerHandlers("hre", {
          testExample: async (
            _context: HookContext,
            _input: string,
          ): Promise<string> => {
            return "third";
          },
        } as Partial<HardhatHooks["hre"]>);

        const result = await hre.hooks.runSequentialHandlers(
          "hre",
          "testExample" as keyof HardhatHooks["hre"],
          ["input"] as any,
        );

        assert.deepEqual(result, ["third", "second", "first"]);
      });

      it("Should let handlers access the passed context (for non-config hooks)", async () => {
        hre.hooks.registerHandlers("hre", {
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

        const result = await hre.hooks.runSequentialHandlers(
          "hre",
          "testExample" as any,
          ["input"],
        );

        assert.deepEqual(result, ["result"]);
      });

      it("Should stop config handlers having access to the hook context", async () => {
        const expectedConfig: HardhatUserConfig = {};

        hre.hooks.registerHandlers("config", {
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

        const validationResult = await hre.hooks.runSequentialHandlers(
          "config",
          "validateUserConfig",
          [expectedConfig],
        );

        assert.deepEqual(validationResult, [[]]);
      });
    });

    describe("runParallelHandlers", () => {
      it("Should return an empty result set if no handlers are provided", async () => {
        const originalConfig: HardhatUserConfig = {};

        const results = await hre.hooks.runParallelHandlers(
          "config",
          "validateUserConfig",
          [originalConfig],
        );

        assert.deepEqual(results, []);
      });

      it("Should return a result per handler", async () => {
        const originalConfig: HardhatUserConfig = {};

        hre.hooks.registerHandlers("config", {
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

        hre.hooks.registerHandlers("config", {
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

        const results = await hre.hooks.runParallelHandlers(
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
        hre.hooks.registerHandlers("hre", {
          created: async (
            context: HookContext,
            hreInHandler: HardhatRuntimeEnvironment,
          ): Promise<void> => {
            assert(
              context !== null && typeof context === "object",
              "hook context should be passed",
            );
            assert.equal(hreInHandler, hre);
          },
        });

        const result = await hre.hooks.runParallelHandlers("hre", "created", [
          hre,
        ]);

        assert.deepEqual(result, [undefined]);
      });

      it("Should not pass the hook context for config", async () => {
        const expectedConfig: HardhatUserConfig = {};

        const validationError = {
          path: [],
          message: "first",
        };

        hre.hooks.registerHandlers("config", {
          validateUserConfig: async (
            config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            assert.equal(config, expectedConfig);
            return [validationError];
          },
        });

        const results = await hre.hooks.runParallelHandlers(
          "config",
          "validateUserConfig",
          [expectedConfig],
        );

        assert.deepEqual(results, [[validationError]]);
      });
    });

    describe("unregisterHandlers", () => {
      it("Should unhook a handler", async () => {
        const hookCategory = {
          validateUserConfig: async (
            _config: HardhatUserConfig,
          ): Promise<HardhatUserConfigValidationError[]> => {
            return [];
          },
        };

        hre.hooks.registerHandlers("config", hookCategory);

        hre.hooks.unregisterHandlers("config", hookCategory);

        const results = await hre.hooks.runParallelHandlers(
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
        hre.hooks.registerHandlers("config", firstHook);
        hre.hooks.registerHandlers("config", secondHook);
        hre.hooks.registerHandlers("config", thirdHook);

        // Act
        hre.hooks.unregisterHandlers("config", secondHook);

        const results = await hre.hooks.runParallelHandlers(
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

        hre.hooks.unregisterHandlers("config", exampleHook);
      });
    });
  });
});
