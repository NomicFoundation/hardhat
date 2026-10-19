import type { SolidityHooks } from "../../../../../../src/types/hooks.js";
import type { HardhatPlugin } from "../../../../../../src/types/plugins.js";
import type {
  CompilationJob,
  CompilerInput,
  SolidityBuildInfo,
} from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";
import { readJsonFile, remove } from "@nomicfoundation/hardhat-utils/fs";

import { FileBuildResultType } from "../../../../../../src/types/solidity.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

// A minimal test plugin: real Yul jobs, artifact emission, and deferred cleanup.
// It deliberately recompiles Yul on each build instead of implementing a cache.
const yulHandlers: Partial<SolidityHooks> = {
  isRootFile: async (context, fsPath, next) =>
    fsPath.endsWith(".yul") || (await next(context, fsPath)),
  build: async (context, roots, options, next) => {
    const yulRoots = roots.filter((root) => root.endsWith(".yul"));
    const solidityRoots = roots.filter((root) => !root.endsWith(".yul"));
    const results = await next(context, solidityRoots, {
      ...options,
      cleanupArtifacts: false,
    });
    assert.ok(results instanceof Map, "the Solidity build should succeed");

    const jobs = await context.solidity.getCompilationJobs(yulRoots, {
      ...options,
      force: true,
      isolated: true,
    });
    assert.ok(jobs.success, "Yul roots should have compilation jobs");

    for (const [root, job] of jobs.compilationJobsPerFile) {
      const solidityInput = await job.getSolcInput();
      const input: CompilerInput = {
        language: "Yul",
        sources: solidityInput.sources,
        settings: {
          optimizer: { enabled: true },
          outputSelection: {
            "*": { "*": ["evm.bytecode", "evm.deployedBytecode"] },
          },
        },
      };
      const hash = await createNonCryptographicHashId(
        JSON.stringify({
          input,
          solcLongVersion: job.solcLongVersion,
        }),
      );
      const yulJob: CompilationJob = {
        dependencyGraph: job.dependencyGraph,
        solcConfig: job.solcConfig,
        solcLongVersion: job.solcLongVersion,
        getSolcInput: async () => input,
        getBuildId: async () =>
          `solc-${job.solcConfig.version.replaceAll(".", "_")}-${hash}`,
      };
      const { output } = await context.solidity.runCompilationJob(
        yulJob,
        options,
      );
      assert.deepEqual(
        output.errors?.filter((error) => error.severity === "error") ?? [],
        [],
      );
      // Yul has no ABI; artifact consumers still expect an empty array.
      for (const contracts of Object.values(output.contracts ?? {})) {
        for (const contract of Object.values(contracts)) {
          contract.abi = [];
        }
      }
      const emitted = await context.solidity.emitArtifacts(
        yulJob,
        output,
        options,
      );
      results.set(root, {
        type: FileBuildResultType.BUILD_SUCCESS,
        compilationJob: yulJob,
        contractArtifactsGenerated: emitted.artifactsPerFile.get(root) ?? [],
        warnings: [],
      });
    }
    if (options?.cleanupArtifacts === true) {
      await context.solidity.cleanupArtifacts(roots, options);
    }
    return results;
  },
};

const yulPlugin: HardhatPlugin = {
  id: "test-yul-compiler",
  hookHandlers: {
    solidity: async () => ({ default: async () => yulHandlers }),
  },
};

describe(
  "custom language build roots",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    for (const splitTestsCompilation of [false, true]) {
      it(`builds Yul artifacts and build infos alongside Solidity (split: ${splitTestsCompilation})`, async () => {
        await using project = await useTestProjectTemplate({
          name: "yul-artifacts",
          version: "1.0.0",
          files: {
            "contracts/Control.sol":
              "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19; contract Control {}",
            "contracts/Answer.yul":
              'object "Answer" { code { mstore(0, 42) return(0, 32) } }',
            "test/Control.t.sol":
              "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19; contract ControlTest { function testAnswer() public pure { assert(42 == 42); } }",
          },
        });
        const hre = await project.getHRE({
          plugins: [yulPlugin],
          solidity: { version: "0.8.19", splitTestsCompilation },
        });

        await hre.tasks.getTask("build").run();
        const artifact = await hre.artifacts.readArtifact("Answer");
        assert.match(artifact.bytecode, /^0x[0-9a-f]+$/);
        assert.deepEqual(artifact.abi, []);
        assert.ok(
          artifact.buildInfoId !== undefined,
          "Yul artifacts should reference a build info",
        );
        const buildInfoPath = await hre.artifacts.getBuildInfoPath(
          artifact.buildInfoId,
        );
        assert.ok(
          buildInfoPath !== undefined,
          "the Yul build info should exist",
        );
        const buildInfo = await readJsonFile<SolidityBuildInfo>(buildInfoPath);
        assert.equal(buildInfo.input.language, "Yul");
        assert.ok(
          (await hre.artifacts.getBuildInfoOutputPath(artifact.buildInfoId)) !==
            undefined,
          "the Yul build info output should exist",
        );

        await hre.tasks.getTask("build").run();
        await hre.artifacts.clearCache();
        assert.deepEqual(await hre.artifacts.readArtifact("Answer"), artifact);
        await hre.tasks
          .getTask("build")
          .run({ files: [path.join(project.path, "contracts/Answer.yul")] });
        const testResult = await hre.tasks
          .getTask(["test", "solidity"])
          .run({ noCompile: true });
        assert.equal(testResult.success, true);

        await remove(path.join(project.path, "contracts/Answer.yul"));
        await hre.tasks.getTask("build").run();
        await hre.artifacts.clearCache();
        assert.equal(await hre.artifacts.artifactExists("Answer"), false);
        assert.equal(
          await hre.artifacts.getBuildInfoPath(artifact.buildInfoId),
          undefined,
        );
        assert.equal(
          await hre.artifacts.getBuildInfoOutputPath(artifact.buildInfoId),
          undefined,
        );
        assert.equal(await hre.artifacts.artifactExists("Control"), true);
      });
    }
  },
);
