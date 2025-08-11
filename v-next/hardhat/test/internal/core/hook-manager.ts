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

import { ensureError } from "@nomicfoundation/hardhat-utils/error";

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

          const examplePlugin1: HardhatPlugin = {
            id: "example1",
            hookHandlers: {
              config: async () => ({
                default: async () => {
                  const handlers: Partial<ConfigHooks> = {
                    extendUserConfig: async (
                      config: HardhatUserConfig,
                      next: (
                        nextConfig: HardhatUserConfig,
                      ) => Promise<HardhatUserConfig>,
                    ) => {
                      sequence.push("FromExamplePlugin1:before");
                      const newConfig = await next(config);
                      sequence.push("FromExamplePlugin2:after");

                      return newConfig;
                    },
                  };

                  return handlers;
                },
              }),
            },
          };

          const examplePlugin2: HardhatPlugin = {
            id: "example2",
            dependencies: () => [Promise.resolve({ default: examplePlugin1 })],
            hookHandlers: {
              config: async () => ({
                default: async () => {
                  const handlers: Partial<ConfigHooks> = {
                    extendUserConfig: async (
                      config: HardhatUserConfig,
                      next: (
                        nextConfig: HardhatUserConfig,
                      ) => Promise<HardhatUserConfig>,
                    ) => {
                      sequence.push("FromExamplePlugin2:before");
                      const newConfig = await next(config);
                      sequence.push("FromExamplePlugin2:after");

                      return newConfig;
                    },
                  };

                  return handlers;
                },
              }),
            },
          };

          hre = await HardhatRuntimeEnvironmentImplementation.create(
            { plugins: [examplePlugin1, examplePlugin2] },
            {},
          );
        });

        it("should run handlers first (in reverse order of registration), then plugins in reverse dependency order then the default", async () => {
          hre.hooks.registerHandlers("config", {
            extendUserConfig: async (
              config: HardhatUserConfig,
              next: (
                nextConfig: HardhatUserConfig,
              ) => Promise<HardhatUserConfig>,
            ) => {
              sequence.push("FromHandler1:before");
              const newConfig = await next(config);
              sequence.push("FromHandler1:after");

              return newConfig;
            },
          });

          hre.hooks.registerHandlers("config", {
            extendUserConfig: async (
              config: HardhatUserConfig,
              next: (
                nextConfig: HardhatUserConfig,
              ) => Promise<HardhatUserConfig>,
            ) => {
              sequence.push("FromHandler2:before");
              const newConfig = await next(config);
              sequence.push("FromHandler2:after");

              return newConfig;
            },
          });

          // We clear the sequence here, as we used the plugin already during the
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
            "FromHandler2:before",
            "FromHandler1:before",
            "FromExamplePlugin2:before",
            "FromExamplePlugin1:before",
            "default",
            "FromExamplePlugin2:after",
            "FromExamplePlugin2:after",
            "FromHandler1:after",
            "FromHandler2:after",
          ]);
        });
      });

      describe("runSequentialHandlers", () => {
        describe("plugin/handler execution order interactions", () => {
          beforeEach(async () => {
            const examplePlugin1: HardhatPlugin = {
              id: "example1",
              hookHandlers: {
                hre: async () => ({
                  default: async () => {
                    const handlers = {
                      testExample: async (
                        _context: HookContext,
                        _input: string,
                      ): Promise<string> => {
                        return "FromExamplePlugin1";
                      },
                    } as Partial<HardhatRuntimeEnvironmentHooks>;

                    return handlers;
                  },
                }),
              },
            };

            const examplePlugin2: HardhatPlugin = {
              id: "example2",
              hookHandlers: {
                hre: async () => ({
                  default: async () => {
                    const handlers = {
                      testExample: async (
                        _context: HookContext,
                        _input: string,
                      ): Promise<string> => {
                        return "FromExamplePlugin2";
                      },
                    } as Partial<HardhatRuntimeEnvironmentHooks>;

                    return handlers;
                  },
                }),
              },
            };

            hre = await HardhatRuntimeEnvironmentImplementation.create(
              { plugins: [examplePlugin1, examplePlugin2] },
              {},
            );
          });

          it("Should run handlers first in reverse registration order, then plugins in dependency order", async () => {
            hre.hooks.registerHandlers("hre", {
              testExample: async (
                _context: HookContext,
                _input: string,
              ): Promise<string> => {
                return "FromHandler1";
              },
            } as Partial<HardhatHooks["hre"]>);

            hre.hooks.registerHandlers("hre", {
              testExample: async (
                _context: HookContext,
                _input: string,
              ): Promise<string> => {
                return "FromHandler2";
              },
            } as Partial<HardhatHooks["hre"]>);

            const result = await hre.hooks.runSequentialHandlers(
              "hre",
              "testExample" as any,
              ["input"],
            );

            assert.deepEqual(result, [
              "FromExamplePlugin1",
              "FromExamplePlugin2",
              "FromHandler1",
              "FromHandler2",
            ]);
          });
        });

        /**
         * This test was added in response to a bug giving the wrong
         * execution order for plugins that use the same hook and depend on each
         * other.
         * If you have two plugins A and B that both update the `hre` through the `hre/created`
         * hook, where B depends on A, then A should run first and B should run second.
         * A concrete example would be a plugin that adds `hre.artifacts`, and then a plugin
         * that mocks the artifacts. The mock plugin should be able to depend on the real
         * plugin, and expect to be executed after the real plugin.
         */
        describe("multiple plugin execution order", () => {
          beforeEach(async () => {
            const plugin1: HardhatPlugin = {
              id: "plugin1",
              hookHandlers: {
                hre: async () => ({
                  default: async () => {
                    const handlers = {
                      created: async (
                        _context: HookContext,
                        givenHre: HardhatRuntimeEnvironment,
                      ): Promise<void> => {
                        givenHre.config.paths.tests = {
                          solidity: "./test-folder-from-plugin1",
                        };
                      },
                    } as Partial<HardhatRuntimeEnvironmentHooks>;

                    return handlers;
                  },
                }),
              },
            };

            const overridingPlugin2: HardhatPlugin = {
              id: "overriding-plugin2",
              dependencies: () => [Promise.resolve({ default: plugin1 })],
              hookHandlers: {
                hre: async () => ({
                  default: async () => {
                    const handlers = {
                      created: async (
                        _context: HookContext,
                        givenHre: HardhatRuntimeEnvironment,
                      ): Promise<void> => {
                        givenHre.config.paths.tests = {
                          solidity: "./test-folder-from-overriding-plugin2",
                        };
                      },
                    } as Partial<HardhatRuntimeEnvironmentHooks>;

                    return handlers;
                  },
                }),
              },
            };

            hre = await HardhatRuntimeEnvironmentImplementation.create(
              { plugins: [plugin1, overridingPlugin2] },
              {},
            );
          });

          it("Should invoke plugins in dependency order during a sequential run", async () => {
            const result = await hre.hooks.runSequentialHandlers(
              "hre",
              "created",
              [hre],
            );

            assert.equal(result.length, 2);
            assert.equal(
              hre.config.paths.tests.solidity,
              "./test-folder-from-overriding-plugin2",
            );
          });
        });
      });

      describe("runParallelHandlers", () => {
        let forceConfigValidationErrorFromPlugin: boolean;

        beforeEach(async () => {
          forceConfigValidationErrorFromPlugin = false;

          const examplePlugin: HardhatPlugin = {
            id: "example",
            hookHandlers: {
              config: async () => ({
                default: async () => {
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
              }),
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
            config: () => import("./fixture-plugins/config-plugin.js"),
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
        const nonExistentImport = "./non-existent.js";

        const examplePlugin: HardhatPlugin = {
          id: "example",
          hookHandlers: {
            config: () => import(nonExistentImport),
          },
          npmPackage: null,
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
    });

    describe("HookContext and HRE extensions interactions", () => {
      it("Should not make the task manager available to the handlers", async () => {
        const assertionPlugin: HardhatPlugin = {
          id: "assertion",
          hookHandlers: {
            hre: async () => ({
              default: async () => ({
                created: async (context, _): Promise<void> => {
                  assert.equal((context as any).tasks, undefined);
                },
              }),
            }),
          },
        };

        await HardhatRuntimeEnvironmentImplementation.create(
          { plugins: [assertionPlugin] },
          {},
        );
      });

      it("Should make the core fields of the HRE available to the handlers", async () => {
        const assertionPlugin: HardhatPlugin = {
          id: "assertion",
          hookHandlers: {
            hre: async () => ({
              default: async () => ({
                created: async (context, hre): Promise<void> => {
                  for (const field in Object.keys(hre)) {
                    if (field !== "tasks") {
                      assert.equal(
                        (context as any)[field],
                        (hre as any)[field],
                      );
                    }
                  }
                },
              }),
            }),
          },
        };

        await HardhatRuntimeEnvironmentImplementation.create(
          { plugins: [assertionPlugin] },
          {},
        );
      });

      it("should make any extension to the HRE available to all the handlers as part of the HookContext", async () => {
        const extensionPlugin: HardhatPlugin = {
          id: "extension",
          hookHandlers: {
            hre: async () => ({
              default: async () => ({
                created: async (_, hre): Promise<void> => {
                  (hre as any).myExtension = "myExtension";
                },
              }),
            }),
          },
        };

        const assertionPlugin: HardhatPlugin = {
          id: "assertion",
          hookHandlers: {
            hre: async () => ({
              default: async () => ({
                created: async (context, _): Promise<void> => {
                  assert.equal((context as any).myExtension, "myExtension");
                },
              }),
            }),
          },
        };

        await HardhatRuntimeEnvironmentImplementation.create(
          { plugins: [extensionPlugin, assertionPlugin] },
          {},
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

        assert.deepEqual(result, ["first", "second", "third"]);
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
