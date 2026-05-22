/* eslint-disable @typescript-eslint/consistent-type-assertions -- We use `as any` casts
   for non-solc compiler configs in tests because "solx" is not registered in the base type system. */
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
import type { CompilationJob } from "../../../../src/types/solidity/compilation-job.js";
import type { CompilerOutputError } from "../../../../src/types/solidity/compiler-io.js";
import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { FileBuildResultType } from "../../../../src/types/solidity.js";

/**
 * Creates a mock plugin for testing that registers additional compiler types so they pass
 * the registeredCompilerTypes post-validation.
 */
function createTypeRegistrationMockPlugin(types: string[]): HardhatPlugin {
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

                    return await next(context, modifiedRootFilePaths, {
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
        plugins: [downloadPlugin, createTypeRegistrationMockPlugin(["solx"])],
        solidity: {
          compilers: [
            { version: "0.8.23" },
            { type: "solx", version: "0.8.23" } as any,
          ],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      // Verify both configs are passed (the hook receives all configs)
      assert.equal(
        capturedConfigs.filter((c) => c.type === undefined).length > 0,
        true,
        "Should include solc configs (type undefined)",
      );
      assert.equal(
        capturedConfigs.filter((c) => (c as any).type === "solx").length > 0,
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
        plugins: [createTypeRegistrationMockPlugin(["solx"])],
        solidity: {
          compilers: [
            { version: "0.8.23" },
            {
              type: "solx",
              version: "0.8.23",
              path: "/mock/path/to/solx",
            } as any,
          ],
        },
      });

      const roots = await hre.solidity.getRootFilePaths();
      // This should not throw — the built-in handler should skip the solx
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
                  return await next(context, compilerConfig);
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
      const fakeOutput: CompilerOutput = {
        contracts: {},
        sources: {},
        errors: [],
      } as any;

      let customCompilerUsed = false;

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
                  if ((compilerConfig.type as string) === "custom") {
                    return customCompiler;
                  }
                  return await next(_context, compilerConfig);
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
          createTypeRegistrationMockPlugin(["custom"]),
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

  describe("processArtifactsAfterSuccessfulBuild", () => {
    describe("on simple-project", () => {
      useFixtureProject("solidity/simple-project");

      it("should run once per successful build with the expected args", async () => {
        let calls = 0;
        let capturedArtifactPaths: readonly string[] | undefined;
        let capturedRootFilePaths: readonly string[] | undefined;
        let capturedBuildOptions: Readonly<BuildOptions> | undefined;

        const plugin: HardhatPlugin = {
          id: "test-process-artifacts-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  processArtifactsAfterSuccessfulBuild: async (
                    _context: HookContext,
                    artifactPaths: readonly string[],
                    buildRootFilePaths: readonly string[],
                    hookBuildOptions: Readonly<BuildOptions> | undefined,
                  ) => {
                    calls += 1;
                    capturedArtifactPaths = artifactPaths;
                    capturedRootFilePaths = buildRootFilePaths;
                    capturedBuildOptions = hookBuildOptions;
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [plugin],
          solidity: "0.8.23",
        });

        const expectedRoots = await hre.solidity.getRootFilePaths();

        const buildOptions: BuildOptions = {
          force: true,
          quiet: true,
          cleanupArtifacts: true,
        };
        const result = await hre.solidity.build(expectedRoots, buildOptions);

        assert.ok(result instanceof Map, "build should return a Map");
        assert.equal(calls, 1, "the hook should be invoked exactly once");
        assert.ok(
          capturedArtifactPaths !== undefined &&
            capturedArtifactPaths.length >= 2,
          "artifactPaths should include the project contracts",
        );
        for (const artifactPath of capturedArtifactPaths ?? []) {
          assert.ok(
            artifactPath.endsWith(".json"),
            `expected json artifact path, got ${artifactPath}`,
          );
        }
        assert.deepEqual(capturedRootFilePaths, expectedRoots);
        assert.deepEqual(capturedBuildOptions, buildOptions);
      });

      it("should include pre-existing artifact paths across multiple builds", async () => {
        const captured: Array<readonly string[]> = [];

        const plugin: HardhatPlugin = {
          id: "test-pre-existing-artifacts-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  processArtifactsAfterSuccessfulBuild: async (
                    _context: HookContext,
                    artifactPaths: readonly string[],
                  ) => {
                    captured.push(artifactPaths);
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [plugin],
          solidity: "0.8.23",
        });

        const roots = await hre.solidity.getRootFilePaths();
        await hre.solidity.build(roots, {
          force: true,
          quiet: true,
          cleanupArtifacts: true,
        });
        await hre.solidity.build(roots, {
          force: true,
          quiet: true,
          cleanupArtifacts: true,
        });

        assert.equal(captured.length, 2, "hook should fire on each build");
        assert.equal(
          captured[0].length,
          captured[1].length,
          "the second build should see the same artifacts as the first",
        );
        assert.ok(captured[0].length >= 2, "expected at least 2 artifacts");
        const containsA = (paths: readonly string[]) =>
          paths.some((p) => p.endsWith(`${path.sep}A.json`));
        const containsB = (paths: readonly string[]) =>
          paths.some((p) => p.endsWith(`${path.sep}B.json`));
        assert.ok(
          containsA(captured[1]) && containsB(captured[1]),
          "second build should report both A.json and B.json",
        );
      });

      it("should include orphan artifacts on disk when cleanupArtifacts is false (default)", async () => {
        const captured: Array<readonly string[]> = [];

        const plugin: HardhatPlugin = {
          id: "test-cleanup-artifacts-false-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  processArtifactsAfterSuccessfulBuild: async (
                    _context: HookContext,
                    artifactPaths: readonly string[],
                  ) => {
                    captured.push(artifactPaths);
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [plugin],
          solidity: "0.8.23",
        });

        const allRoots = await hre.solidity.getRootFilePaths();
        // First build emits both A and B.
        await hre.solidity.build(allRoots, { force: true, quiet: true });
        const containsA = (paths: readonly string[]) =>
          paths.some((p) => p.endsWith(`${path.sep}A.json`));
        const containsB = (paths: readonly string[]) =>
          paths.some((p) => p.endsWith(`${path.sep}B.json`));
        assert.ok(
          containsA(captured[0]) && containsB(captured[0]),
          "first build should emit both A and B",
        );

        // Second build drops B. Default cleanupArtifacts === false ⇒
        // B's artifact must remain on disk.
        const rootA = allRoots.find((p) => p.endsWith("A.sol"));
        assert.ok(rootA !== undefined, "fixture should expose A.sol root");
        await hre.solidity.build([rootA], { force: true, quiet: true });

        assert.equal(captured.length, 2, "hook should fire on both builds");
        assert.ok(
          containsA(captured[1]) && containsB(captured[1]),
          "B.json should still be visible to the hook (no cleanup)",
        );
      });
    });

    describe("on unified-with-tests-project", () => {
      useFixtureProject("solidity/unified-with-tests-project");

      it("should exclude test artifacts even when built alongside contracts in unified mode", async () => {
        let capturedArtifactPaths: readonly string[] | undefined;

        const plugin: HardhatPlugin = {
          id: "test-unified-mode-test-artifacts-excluded-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  processArtifactsAfterSuccessfulBuild: async (
                    _context: HookContext,
                    artifactPaths: readonly string[],
                  ) => {
                    capturedArtifactPaths = artifactPaths;
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [plugin],
          solidity: "0.8.23",
        });

        const roots = await hre.solidity.getRootFilePaths();
        await hre.solidity.build(roots, {
          force: true,
          quiet: true,
          cleanupArtifacts: true,
        });

        assert.ok(
          capturedArtifactPaths !== undefined,
          "hook should have fired",
        );
        const paths = capturedArtifactPaths ?? [];
        const containsCounter = paths.some((p) =>
          p.endsWith(`${path.sep}Counter.json`),
        );
        const containsCounterTest = paths.some((p) =>
          p.includes(`${path.sep}Counter.t.sol${path.sep}`),
        );
        assert.ok(
          containsCounter,
          `expected Counter.json to be present, got: ${paths.join(", ")}`,
        );
        assert.equal(
          containsCounterTest,
          false,
          `expected test artifacts to be filtered out, got: ${paths.join(", ")}`,
        );
      });
    });

    describe("with splitTestsCompilation", () => {
      useFixtureProject("solidity/simple-project");

      it("should not run when scope is 'tests'", async () => {
        let calls = 0;

        const plugin: HardhatPlugin = {
          id: "test-process-artifacts-tests-scope-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  processArtifactsAfterSuccessfulBuild: async () => {
                    calls += 1;
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment({
          plugins: [plugin],
          solidity: { version: "0.8.23", splitTestsCompilation: true },
        });

        const testRoots = await hre.solidity.getRootFilePaths({
          scope: "tests",
        });
        await hre.solidity.build(testRoots, {
          force: true,
          quiet: true,
          scope: "tests",
        });

        assert.equal(calls, 0, "hook should not fire for scope === 'tests'");
      });
    });
  });

  describe("getCompilationJobErrors", () => {
    useFixtureProject("solidity/broken-project");

    it("should run with the compilation job and compiler output containing errors", async () => {
      let capturedJob: CompilationJob | undefined;
      let capturedOutput: CompilerOutput | undefined;

      const plugin: HardhatPlugin = {
        id: "test-compilation-errors-capture-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompilationJobErrors: async (
                  context: HookContext,
                  compilationJob: Readonly<CompilationJob>,
                  compilerOutput: Readonly<CompilerOutput>,
                  next: (
                    nextContext: HookContext,
                    nextCompilationJob: Readonly<CompilationJob>,
                    nextCompilerOutput: Readonly<CompilerOutput>,
                  ) => Promise<CompilerOutputError[]>,
                ) => {
                  capturedJob = compilationJob;
                  capturedOutput = compilerOutput;
                  return await next(context, compilationJob, compilerOutput);
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [plugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      const result = await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(result instanceof Map, "result should be a Map");
      assert.ok(capturedJob !== undefined, "compilation job should be passed");
      assert.ok(
        capturedOutput !== undefined,
        "compiler output should be passed",
      );
      assert.ok(
        (capturedOutput.errors ?? []).length > 0,
        "the compiler output should contain errors",
      );
      assert.ok(
        capturedJob.solcConfig !== undefined,
        "the compilation job should expose its solc config",
      );
    });

    it("should remap source-name paths to filesystem paths in the default impl", async () => {
      let returnedErrors: CompilerOutputError[] | undefined;

      const plugin: HardhatPlugin = {
        id: "test-compilation-errors-default-remap-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompilationJobErrors: async (
                  context: HookContext,
                  compilationJob: Readonly<CompilationJob>,
                  compilerOutput: Readonly<CompilerOutput>,
                  next: (
                    nextContext: HookContext,
                    nextCompilationJob: Readonly<CompilationJob>,
                    nextCompilerOutput: Readonly<CompilerOutput>,
                  ) => Promise<CompilerOutputError[]>,
                ) => {
                  returnedErrors = await next(
                    context,
                    compilationJob,
                    compilerOutput,
                  );
                  return returnedErrors;
                },
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [plugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      await hre.solidity.build(roots, { force: true, quiet: true });

      assert.ok(
        returnedErrors !== undefined && returnedErrors.length > 0,
        "default impl should return remapped errors",
      );
      const formatted = returnedErrors
        .map((e) => e.formattedMessage ?? "")
        .join("\n");
      const expectedRemappedPath = `--> .${path.sep}${path.join(
        "contracts",
        "Broken.sol",
      )}`;
      assert.ok(
        formatted.includes(expectedRemappedPath),
        `expected remapped formattedMessage to include '${expectedRemappedPath}', got: ${formatted}`,
      );
    });

    it("should allow a plugin to replace the errors used downstream", async () => {
      const fakeError: CompilerOutputError = {
        type: "TestError",
        component: "general",
        message: "synthetic error from plugin",
        severity: "error",
        formattedMessage: "synthetic error from plugin",
      };

      const plugin: HardhatPlugin = {
        id: "test-compilation-errors-replace-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompilationJobErrors: async () => [fakeError],
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [plugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      const result = await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(result instanceof Map, "result should be a Map");
      const failures = [...result.values()].filter(
        (r) => r.type === FileBuildResultType.BUILD_FAILURE,
      );
      assert.ok(failures.length > 0, "expected at least one build failure");
      for (const failure of failures) {
        if (failure.type !== FileBuildResultType.BUILD_FAILURE) {
          continue;
        }

        assert.deepEqual(
          failure.errors,
          [fakeError],
          "build result should expose the plugin-provided errors",
        );
      }
    });

    it("should not affect build pass/fail (filtering errors keeps the build failing)", async () => {
      const plugin: HardhatPlugin = {
        id: "test-compilation-errors-no-flip-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                getCompilationJobErrors: async () => [],
              };

              return handlers;
            },
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment({
        plugins: [plugin],
        solidity: "0.8.23",
      });

      const roots = await hre.solidity.getRootFilePaths();
      const result = await hre.solidity.build(roots, {
        force: true,
        quiet: true,
      });

      assert.ok(result instanceof Map, "result should be a Map");
      const hasFailure = [...result.values()].some(
        (r) => r.type === FileBuildResultType.BUILD_FAILURE,
      );
      assert.ok(
        hasFailure,
        "build should still be marked as failed even when the plugin returns no errors",
      );
    });
  });
});
