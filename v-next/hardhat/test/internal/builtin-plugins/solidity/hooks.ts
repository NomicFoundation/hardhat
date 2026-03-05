import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  SolidityCompilerConfig,
} from "../../../../src/types/config.js";
import type {
  HookContext,
  SolidityHooks,
} from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { HardhatPlugin } from "../../../../src/types/plugins.js";
import type {
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
} from "../../../../src/types/solidity/build-system.js";
import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";

/**
 * Creates a plugin that registers additional compiler types so they pass
 * the registeredCompilerTypes post-validation.
 */
function createTypeRegistrationPlugin(types: string[]): HardhatPlugin {
  return {
    id: `test-register-types-${types.join("-")}`,
    hookHandlers: {
      config: async () => ({
        default: async () => ({
          resolveUserConfig: async (
            userConfig: HardhatUserConfig,
            resolveConfigurationVariable: ConfigurationVariableResolver,
            next: (
              nextUserConfig: HardhatUserConfig,
              nextResolveConfigurationVariable: ConfigurationVariableResolver,
            ) => Promise<HardhatConfig>,
          ) => {
            const resolved = await next(
              userConfig,
              resolveConfigurationVariable,
            );
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test registers unregistered types
            resolved.solidity.registeredCompilerTypes.push(...(types as any[]));
            return resolved;
          },
        }),
      }),
    },
  };
}

describe("solidity - hooks", () => {
  describe("invokeSolc", () => {
    useFixtureProject("solidity/simple-project");

    const expectedSolidityVersion = "0.8.23";

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional fake for test
    const fakeOutput: CompilerOutput = {} as any;

    let hre: HardhatRuntimeEnvironment;
    let invokeSolcTriggered: boolean = false;
    let passedCompiler: Compiler | undefined;
    let passedSolcInput: CompilerInput | undefined;
    let returnedSolcOutput: CompilerOutput | undefined;

    beforeEach(async function () {
      invokeSolcTriggered = false;
      passedSolcInput = undefined;
      returnedSolcOutput = undefined;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional mocking of compiler
      const fakeCompiler: Compiler = {
        compile: () => {
          return fakeOutput;
        },
      } as any;

      const onBuildPlugin: HardhatPlugin = {
        id: "test-on-build-complete-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                invokeSolc: async (
                  context: HookContext,
                  compiler: Compiler,
                  solcInput: CompilerInput,
                  solcConfig: SolidityCompilerConfig,
                  next: (
                    nextContext: HookContext,
                    nextCompiler: Compiler,
                    nextSolcInput: CompilerInput,
                    nextSolidityCompilerConfig: SolidityCompilerConfig,
                  ) => Promise<CompilerOutput>,
                ) => {
                  passedCompiler = compiler;
                  passedSolcInput = solcInput;

                  returnedSolcOutput = await next(
                    context,
                    fakeCompiler,
                    solcInput,
                    solcConfig,
                  );

                  invokeSolcTriggered = true;

                  return returnedSolcOutput;
                },
              };

              return handlers;
            },
          }),
        },
      };

      hre = await createHardhatRuntimeEnvironment({
        plugins: [onBuildPlugin],
        solidity: expectedSolidityVersion,
      });
    });

    it("should trigger the invokeSolc hook", async () => {
      const buildTask = hre.tasks.getTask("build");

      await buildTask.run({
        force: true,
        noTests: true,
        quiet: true,
      });

      assert.ok(invokeSolcTriggered, "The invokeSolc hook should be triggered");

      assert.equal(passedCompiler?.version, expectedSolidityVersion);
      assert.equal(passedSolcInput?.language, "Solidity");
      assert.equal(returnedSolcOutput, fakeOutput);
    });
  });

  describe("build", () => {
    useFixtureProject("solidity/simple-project");

    describe("basic invocation", () => {
      it("should trigger the onBuild hook", async () => {
        let onBuildTriggered = false;
        let capturedRootFilePaths: string[] = [];
        let capturedOptions: BuildOptions | undefined;
        let returnedResult:
          | CompilationJobCreationError
          | Map<string, FileBuildResult>
          | undefined;

        const onBuildPlugin: HardhatPlugin = {
          id: "test-on-build-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  build: async (
                    context: HookContext,
                    rootFilePaths: string[],
                    options: BuildOptions | undefined,
                    next: (
                      nextContext: HookContext,
                      nextRootFilePaths: string[],
                      nextOptions: BuildOptions | undefined,
                    ) => Promise<
                      CompilationJobCreationError | Map<string, FileBuildResult>
                    >,
                  ) => {
                    capturedRootFilePaths = rootFilePaths;
                    capturedOptions = options;
                    onBuildTriggered = true;

                    returnedResult = await next(
                      context,
                      rootFilePaths,
                      options,
                    );

                    return returnedResult;
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [onBuildPlugin],
          solidity: "0.8.23",
        });

        const buildSystem = hre.solidity;
        const roots = await buildSystem.getRootFilePaths();

        const result = await buildSystem.build(roots, {
          force: true,
          quiet: true,
        });

        assert.ok(onBuildTriggered, "The onBuild hook should be triggered");
        assert.deepEqual(capturedRootFilePaths, roots);
        assert.deepEqual(capturedOptions, { force: true, quiet: true });
        assert.deepEqual(result, returnedResult);
        assert.ok(returnedResult instanceof Map, "Result should be a Map");
        assert.ok(returnedResult.size > 0, "Result map should not be empty");
      });
    });

    describe("parameter modification", () => {
      it("should allow modifying rootFilePaths before calling next", async () => {
        let modifiedRootFilePaths: string[] = [];

        const onBuildPlugin: HardhatPlugin = {
          id: "test-on-build-modify-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  build: async (
                    context: HookContext,
                    rootFilePaths: string[],
                    options: BuildOptions | undefined,
                    next: (
                      nextContext: HookContext,
                      nextRootFilePaths: string[],
                      nextOptions: BuildOptions | undefined,
                    ) => Promise<
                      CompilationJobCreationError | Map<string, FileBuildResult>
                    >,
                  ) => {
                    // Filter to only first file
                    modifiedRootFilePaths = rootFilePaths.slice(0, 1);

                    return next(context, modifiedRootFilePaths, {
                      ...options,
                      force: true,
                    });
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [onBuildPlugin],
          solidity: "0.8.23",
        });

        const buildSystem = hre.solidity;
        const roots = await buildSystem.getRootFilePaths();
        assert.ok(
          roots.length > 1,
          "Expected more than 1 root file path in the fixture project",
        );

        const result = await buildSystem.build(roots, { quiet: true });

        assert.ok(result instanceof Map, "Result should be a Map");
        // Only 1 file should be in results since we filtered
        assert.equal(modifiedRootFilePaths.length, 1);
        assert.equal(result.size, modifiedRootFilePaths.length);
      });
    });
  });

  describe("downloadCompilers", () => {
    useFixtureProject("solidity/simple-project");

    it("should invoke downloadCompilers hook with compiler configs during build", async () => {
      let capturedConfigs: SolidityCompilerConfig[] = [];
      let downloadHookCalled = false;

      const downloadPlugin: HardhatPlugin = {
        id: "test-download-compilers-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                downloadCompilers: async (
                  _context: HookContext,
                  compilerConfigs: SolidityCompilerConfig[],
                  _quiet: boolean,
                ) => {
                  downloadHookCalled = true;
                  capturedConfigs = compilerConfigs;
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [downloadPlugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(
        downloadHookCalled,
        "The downloadCompilers hook should be triggered during build",
      );
      assert.ok(
        capturedConfigs.length > 0,
        "The downloadCompilers hook should receive compiler configs",
      );
      assert.equal(
        capturedConfigs[0].version,
        "0.8.23",
        "The compiler config should have the expected version",
      );
    });

    it("should pass all compiler configs from all profiles", async () => {
      let capturedConfigs: SolidityCompilerConfig[] = [];

      const downloadPlugin: HardhatPlugin = {
        id: "test-download-all-configs-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                downloadCompilers: async (
                  _context: HookContext,
                  compilerConfigs: SolidityCompilerConfig[],
                  _quiet: boolean,
                ) => {
                  capturedConfigs = compilerConfigs;
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [downloadPlugin],
        solidity: {
          compilers: [{ version: "0.8.23" }, { version: "0.8.24" }],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      const versions = capturedConfigs.map((c) => c.version);
      // Both default and production profiles have these compilers
      assert.ok(versions.includes("0.8.23"), "Should include version 0.8.23");
      assert.ok(versions.includes("0.8.24"), "Should include version 0.8.24");
    });

    it("should include overrides in compiler configs", async () => {
      let capturedConfigs: SolidityCompilerConfig[] = [];

      const downloadPlugin: HardhatPlugin = {
        id: "test-download-overrides-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                downloadCompilers: async (
                  _context: HookContext,
                  compilerConfigs: SolidityCompilerConfig[],
                  _quiet: boolean,
                ) => {
                  capturedConfigs = compilerConfigs;
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [downloadPlugin],
        solidity: {
          compilers: [{ version: "0.8.23" }],
          overrides: {
            "contracts/Special.sol": { version: "0.8.24" },
          },
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      const versions = capturedConfigs.map((c) => c.version);
      assert.ok(
        versions.includes("0.8.24"),
        "Should include override version 0.8.24",
      );
    });

    it("should filter non-solc configs in built-in handler", async () => {
      // The built-in handler should only download solc compilers.
      // A non-solc config (type: "solx") should not cause a download failure.
      // We verify this by building with a mixed config — if the built-in
      // handler tried to download "solx" type, it would fail since there's
      // no solx binary to download via the solc downloader.
      let capturedConfigs: SolidityCompilerConfig[] = [];

      const downloadPlugin: HardhatPlugin = {
        id: "test-filter-non-solc-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                downloadCompilers: async (
                  _context: HookContext,
                  compilerConfigs: SolidityCompilerConfig[],
                  _quiet: boolean,
                ) => {
                  capturedConfigs = compilerConfigs;
                  // downloadCompilers is a parallel hook (no next parameter),
                  // so all registered handlers run concurrently.
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [downloadPlugin, createTypeRegistrationPlugin(["solx"])],
        solidity: {
          compilers: [
            { version: "0.8.23" },
            { type: "solx", version: "0.8.23" },
          ],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      // Verify both configs are passed (the hook receives ALL configs)
      assert.equal(
        capturedConfigs.filter((c) => c.type === undefined).length > 0,
        true,
        "Should include solc configs (type undefined)",
      );
      assert.equal(
        capturedConfigs.filter((c) => c.type === "solx").length > 0,
        true,
        "Should include non-solc configs (type solx)",
      );
    });

    it("should only download solc compilers in built-in handler", async () => {
      // Build with both solc and non-solc configs.
      // The built-in handler uses isSolcConfig() to filter — only solc
      // versions should be downloaded. If it tried to download a non-existent
      // "solx" version via the solc downloader, the build would fail.
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [createTypeRegistrationPlugin(["solx"])],
        solidity: {
          compilers: [
            { version: "0.8.23" },
            { type: "solx", version: "0.8.23", path: "/mock/path/to/solx" },
          ],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      // This should NOT throw — the built-in handler should skip the solx
      // config and only download solc 0.8.23 (which is cached)
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });
    });
  });

  describe("getCompiler", () => {
    useFixtureProject("solidity/simple-project");

    it("should invoke getCompiler hook during build", async () => {
      let getCompilerCalled = false;
      let capturedConfig: SolidityCompilerConfig | undefined;

      const getCompilerPlugin: HardhatPlugin = {
        id: "test-get-compiler-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompiler: async (
                  context: HookContext,
                  compilerConfig: SolidityCompilerConfig,
                  next: (
                    nextContext: HookContext,
                    nextCompilerConfig: SolidityCompilerConfig,
                  ) => Promise<Compiler>,
                ) => {
                  getCompilerCalled = true;
                  capturedConfig = compilerConfig;

                  // Fall through to the default handler (solc)
                  return next(context, compilerConfig);
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [getCompilerPlugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(getCompilerCalled, "The getCompiler hook should be called");
      assert.equal(
        capturedConfig?.version,
        "0.8.23",
        "Should receive the compiler config with the expected version",
      );
    });

    it("should allow plugins to return a custom compiler", async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional fake for test
      const fakeOutput: CompilerOutput = {
        contracts: {},
        sources: {},
        errors: [],
      } as any;

      let customCompilerUsed = false;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional mocking of compiler
      const customCompiler: Compiler = {
        version: "0.8.23",
        longVersion: "0.8.23+custom",
        compilerPath: "/mock/custom-compiler",
        isSolcJs: false,
        compile: async () => {
          customCompilerUsed = true;
          return fakeOutput;
        },
      } as any;

      const customCompilerPlugin: HardhatPlugin = {
        id: "test-custom-compiler-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompiler: async (
                  _context: HookContext,
                  compilerConfig: SolidityCompilerConfig,
                  next: (
                    nextContext: HookContext,
                    nextCompilerConfig: SolidityCompilerConfig,
                  ) => Promise<Compiler>,
                ) => {
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test uses unregistered type
                  if ((compilerConfig.type as string) === "custom") {
                    return customCompiler;
                  }
                  return next(_context, compilerConfig);
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [
          customCompilerPlugin,
          createTypeRegistrationPlugin(["custom"]),
        ],
        solidity: {
          compilers: [{ type: "custom" as any, version: "0.8.23" }],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(
        customCompilerUsed,
        "The custom compiler should have been used for compilation",
      );
    });
  });
});
