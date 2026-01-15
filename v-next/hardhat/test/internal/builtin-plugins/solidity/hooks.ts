import type { Compiler } from "../../../../src/internal/builtin-plugins/solidity/build-system/compiler/compiler.js";
import type { SolcConfig } from "../../../../src/types/config.js";
import type {
  HookContext,
  SolidityHooks,
} from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { HardhatPlugin } from "../../../../src/types/plugins.js";
import type {
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
});
