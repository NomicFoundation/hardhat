import type { SolidityHooks } from "../../../../src/types/hooks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { FileBuildResultType } from "../../../../src/types/solidity.js";

describe("Rust hook policy", () => {
  describe("ignored handlers", () => {
    useFixtureProject("solidity/simple-project");

    it("builds on Rust with every ignored handler registered", async () => {
      const ignored = async (): Promise<never> => {
        assert.fail("An ignored hook was invoked");
      };
      const handlers: Partial<SolidityHooks> = {
        getCompiler: ignored,
        invokeSolc: ignored,
        readSourceFile: ignored,
        onCleanUpArtifacts: ignored,
        preprocessProjectFileBeforeBuilding: ignored,
        preprocessSolcInputBeforeBuilding: ignored,
        getCompilationJobErrors: ignored,
      };
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: "0.8.23",
          plugins: [
            {
              id: "test-ignored-hooks",
              hookHandlers: {
                solidity: async () => ({ default: async () => handlers }),
              },
            },
          ],
        },
        { rustBuildSystem: true },
      );
      // Dynamic registration must not cause fallback either.
      hre.hooks.registerHandlers("solidity", handlers);
      const roots = await hre.solidity.getRootFilePaths();
      const result = await hre.solidity.build(roots, {
        force: true,
        cleanupArtifacts: true,
        quiet: true,
      });
      assert.ok(result instanceof Map, "Compilation jobs should be created");
      assert.ok(result.size > 0, "The fixture should build at least one root");
      assert.ok(
        [...result.values()].every(
          (file) => file.type === FileBuildResultType.BUILD_SUCCESS,
        ),
        "Ignoring handlers should leave the fixture build successful",
      );
      await hre.solidity.cleanupArtifacts(roots);
    });

    for (const dynamic of [false, true]) {
      it(`falls back for a ${dynamic ? "dynamic" : "declared"} remappings handler`, async () => {
        let readByTypeScript = false;
        const handlers: Partial<SolidityHooks> = {
          readNpmPackageRemappings: async () => [],
          readSourceFile: async (context, file, next) => {
            readByTypeScript = true;
            return await next(context, file);
          },
        };
        const hre = await createHardhatRuntimeEnvironment(
          {
            solidity: "0.8.23",
            plugins: dynamic
              ? []
              : [
                  {
                    id: "test-remappings-fallback",
                    hookHandlers: {
                      solidity: async () => ({ default: async () => handlers }),
                    },
                  },
                ],
          },
          { rustBuildSystem: true },
        );
        if (dynamic) {
          hre.hooks.registerHandlers("solidity", handlers);
        }
        await hre.solidity.build(await hre.solidity.getRootFilePaths(), {
          force: true,
          quiet: true,
        });
        assert.equal(readByTypeScript, true);
      });
    }
  });

  describe("default errors", () => {
    useFixtureProject("solidity/broken-project");

    it("keeps real compiler errors when a plugin attempts to hide them", async () => {
      const hre = await createHardhatRuntimeEnvironment(
        { solidity: "0.8.23" },
        { rustBuildSystem: true },
      );
      hre.hooks.registerHandlers("solidity", {
        getCompilationJobErrors: async () =>
          assert.fail("Ignored diagnostic handler ran"),
      });
      const result = await hre.solidity.build(
        await hre.solidity.getRootFilePaths(),
        { force: true, quiet: true },
      );
      assert.ok(result instanceof Map, "Compilation jobs should be created");
      const failures = [...result.values()].filter(
        (file) => file.type === FileBuildResultType.BUILD_FAILURE,
      );
      assert.ok(
        failures.length > 0,
        "Real compiler errors must still fail the build",
      );
      assert.ok(
        failures.every((file) => file.errors.length > 0),
        "Default compiler errors must be retained",
      );
    });
  });
});
