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
  describe("onSolcCompileComplete", () => {
    useFixtureProject("solidity/simple-project");

    let hre: HardhatRuntimeEnvironment;
    let onSolcCompileCompleteTriggered: boolean = false;
    let passedSolcInput: CompilerInput | undefined;
    let passedSolcOutput: CompilerOutput | undefined;

    beforeEach(async function () {
      onSolcCompileCompleteTriggered = false;
      passedSolcInput = undefined;
      passedSolcOutput = undefined;

      const onBuildPlugin: HardhatPlugin = {
        id: "test-on-build-complete-plugin",
        hookHandlers: {
          solidity: async () => ({
            default: async () => {
              const handlers: Partial<SolidityHooks> = {
                onSolcCompileComplete: async (
                  context: HookContext,
                  solcConfig: SolcConfig,
                  solcInput: CompilerInput,
                  solcOutput: CompilerOutput,
                  next: (
                    nextContext: HookContext,
                    nextSolcConfig: SolcConfig,
                    nextSolcInput: CompilerInput,
                    nextSolcOutput: CompilerOutput,
                  ) => Promise<void>,
                ) => {
                  passedSolcInput = solcInput;
                  passedSolcOutput = solcOutput;

                  await next(context, solcConfig, solcInput, solcOutput);

                  onSolcCompileCompleteTriggered = true;
                },
              };

              return handlers;
            },
          }),
        },
      };

      hre = await createHardhatRuntimeEnvironment({
        plugins: [onBuildPlugin],
      });
    });

    it("should trigger the onSolcCompileComplete hook", async () => {
      const buildTask = hre.tasks.getTask("build");

      await buildTask.run({
        force: true,
        noTests: true,
      });

      assert.ok(
        onSolcCompileCompleteTriggered,
        "The onSolcCompileComplete hook should be triggered",
      );

      assert.equal(passedSolcInput?.language, "Solidity");
      const sources = passedSolcOutput?.sources;
      assert.ok(
        sources !== undefined,
        "The solc output should includes compiled contract sources",
      );
      assert.deepEqual(Object.keys(sources), [
        "project/contracts/A.sol",
        "project/contracts/B.sol",
      ]);
    });
  });
});
