import type { SolcConfig } from "../../../../src/types/config.js";
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
                  solcConfig: SolcConfig,
                  next: (
                    nextContext: HookContext,
                    nextCompiler: Compiler,
                    nextSolcInput: CompilerInput,
                    nextSolcConfig: SolcConfig,
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
      });

      assert.ok(invokeSolcTriggered, "The invokeSolc hook should be triggered");

      assert.equal(passedCompiler?.version, expectedSolidityVersion);
      assert.equal(passedSolcInput?.language, "Solidity");
      assert.equal(returnedSolcOutput, fakeOutput);
    });
  });

  describe("build", () => {
    useFixtureProject("solidity/simple-project");

    const expectedSolidityVersion = "0.8.23";

    let hre: HardhatRuntimeEnvironment;
    let onBuildTriggered: boolean;
    let capturedRootFilePaths: string[];
    let capturedOptions: BuildOptions | undefined;
    let returnedResult:
      | CompilationJobCreationError
      | Map<string, FileBuildResult>;

    describe("basic invocation", () => {
      beforeEach(async function () {
        onBuildTriggered = false;
        capturedRootFilePaths = [];
        capturedOptions = undefined;

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

        hre = await createHardhatRuntimeEnvironment({
          plugins: [onBuildPlugin],
          solidity: expectedSolidityVersion,
        });
      });

      it("should trigger the onBuild hook", async () => {
        const buildSystem = hre.solidity;
        const rootFilePaths = await buildSystem.getRootFilePaths();

        await buildSystem.build(rootFilePaths, { force: true });

        assert.ok(onBuildTriggered, "The onBuild hook should be triggered");
      });

      it("should receive rootFilePaths parameter", async () => {
        const buildSystem = hre.solidity;
        const rootFilePaths = await buildSystem.getRootFilePaths();

        await buildSystem.build(rootFilePaths, { force: true });

        assert.ok(
          capturedRootFilePaths.length > 0,
          "rootFilePaths should not be empty",
        );
        assert.deepEqual(capturedRootFilePaths, rootFilePaths);
      });

      it("should receive options parameter", async () => {
        const buildSystem = hre.solidity;
        const rootFilePaths = await buildSystem.getRootFilePaths();

        const options: BuildOptions = { force: true, quiet: true };
        await buildSystem.build(rootFilePaths, options);

        assert.ok(
          capturedOptions !== undefined,
          "options should be passed to the hook",
        );
        assert.equal(capturedOptions.force, true);
        assert.equal(capturedOptions.quiet, true);
      });

      it("should return build results", async () => {
        const buildSystem = hre.solidity;
        const rootFilePaths = await buildSystem.getRootFilePaths();

        await buildSystem.build(rootFilePaths, { force: true });

        assert.ok(returnedResult instanceof Map, "Result should be a Map");
        assert.ok(returnedResult.size > 0, "Result map should not be empty");
      });
    });

    describe("parameter modification", () => {
      let modifiedRootFilePaths: string[];

      beforeEach(async function () {
        modifiedRootFilePaths = [];

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

        hre = await createHardhatRuntimeEnvironment({
          plugins: [onBuildPlugin],
          solidity: expectedSolidityVersion,
        });
      });

      it("should allow modifying rootFilePaths before calling next", async () => {
        const buildSystem = hre.solidity;
        const rootFilePaths = await buildSystem.getRootFilePaths();
        assert.ok(
          rootFilePaths.length > 1,
          "Expected more than 1 root file path in the fixture project",
        );

        const result = await buildSystem.build(rootFilePaths);

        assert.ok(result instanceof Map, "Result should be a Map");
        // Only 1 file should be in results since we filtered
        assert.equal(modifiedRootFilePaths.length, 1);
        assert.equal(result.size, modifiedRootFilePaths.length);
      });
    });
  });
});
