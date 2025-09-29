import type { SolidityConfig } from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type {
  SolidityBuildInfoOutput,
  SolidityBuildSystem,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, beforeEach, describe, it, mock } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  getTmpDir,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  getAllFilesMatching,
  readJsonFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";

import { SolidityBuildSystemImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";

async function emitArtifacts(solidity: SolidityBuildSystem): Promise<void> {
  const rootFilePaths = await solidity.getRootFilePaths();
  const compilationJobsResult = await solidity.getCompilationJobs(
    rootFilePaths,
    {
      isolated: false,
      quiet: true,
    },
  );

  assert.ok(
    !("reason" in compilationJobsResult),
    "getCompilationJobs should not error",
  );

  const compilationJobs = compilationJobsResult.compilationJobsPerFile;

  assert.ok(compilationJobs instanceof Map, "compilationJobs should be a Map");

  const artifactsPath = path.join(process.cwd(), "artifacts");

  const buildIds = new Set<string>();
  for (const compilationJob of compilationJobs.values()) {
    const buildId = await compilationJob.getBuildId();
    if (!buildIds.has(buildId)) {
      buildIds.add(buildId);
      const buildInfoOutput = await readJsonFile<SolidityBuildInfoOutput>(
        path.join(artifactsPath, "build-info", `${buildId}.output.json`),
      );
      await solidity.emitArtifacts(compilationJob, buildInfoOutput.output, {
        scope: "contracts",
      });
    }
  }
}

// NOTE: This test is slow because solidity compilers are downloaded.
describe(
  "SolidityBuildSystemImplementation",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  () => {
    let actualArtifactsPath: string;
    let actualCachePath: string;
    let expectedArtifactsPath: string;
    let expectedCachePath: string;
    let solidity: SolidityBuildSystemImplementation;

    useFixtureProject("solidity/example-project");

    const solidityConfig: SolidityConfig = {
      profiles: {
        default: {
          compilers: [
            {
              version: "0.8.22",
              settings: {},
            },
            {
              version: "0.7.1",
              settings: {},
            },
          ],
          overrides: {},
          isolated: false,
          preferWasm: false,
        },
      },
      npmFilesToBuild: [],
    };

    before(async () => {
      expectedArtifactsPath = path.join(process.cwd(), "artifacts");
      expectedCachePath = path.join(process.cwd(), "cache");
      await remove(expectedArtifactsPath);
      await remove(expectedCachePath);
      const hooks = new HookManagerImplementation(process.cwd(), []);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
      hooks.setContext({} as HookContext);
      solidity = new SolidityBuildSystemImplementation(hooks, {
        solidityConfig,
        projectRoot: process.cwd(),
        soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
        artifactsPath: expectedArtifactsPath,
        cachePath: expectedCachePath,
        solidityTestsPath: path.join(process.cwd(), "tests"),
      });
      const rootFilePaths = await solidity.getRootFilePaths();
      await solidity.build(rootFilePaths, {
        force: true,
        isolated: false,
        quiet: true,
      });
    });

    beforeEach(async () => {
      const tmpDir = await getTmpDir("solidity-build-system-implementation");
      actualArtifactsPath = path.join(tmpDir, "artifacts");
      actualCachePath = path.join(tmpDir, "cache");
      const hooks = new HookManagerImplementation(process.cwd(), []);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
      hooks.setContext({} as HookContext);
      solidity = new SolidityBuildSystemImplementation(hooks, {
        solidityConfig,
        projectRoot: process.cwd(),
        soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
        artifactsPath: actualArtifactsPath,
        cachePath: actualCachePath,
        solidityTestsPath: path.join(process.cwd(), "tests"),
      });
    });

    describe("emitArtifacts", () => {
      it("should successfully emit the artifacts", async () => {
        await emitArtifacts(solidity);

        const expectedArtifactPaths = await getAllFilesMatching(
          expectedArtifactsPath,
          (f) => f.endsWith(".json"),
        );

        for (const expectedArtifactPath of expectedArtifactPaths) {
          const relativeArtifactPath = path.relative(
            expectedArtifactsPath,
            expectedArtifactPath,
          );
          const actualArtifactPath = path.join(
            actualArtifactsPath,
            relativeArtifactPath,
          );
          assert.ok(
            await exists(actualArtifactPath),
            `Artifact file ${relativeArtifactPath} should exist`,
          );
          const expectedArtifact = await readJsonFile(expectedArtifactPath);
          const actualArtifact = await readJsonFile(actualArtifactPath);
          assert.deepEqual(
            actualArtifact,
            expectedArtifact,
            `Artifact file ${relativeArtifactPath} should be the same`,
          );
        }
      });
    });

    describe("cleanupArtifacts", () => {
      let actualArtifactPathsBefore: string[];
      let duplicatedContractNamesDeclarationFilePath: string;

      beforeEach(async () => {
        await emitArtifacts(solidity);
        actualArtifactPathsBefore =
          await getAllFilesMatching(actualArtifactsPath);
        duplicatedContractNamesDeclarationFilePath = path.join(
          actualArtifactsPath,
          "artifacts.d.ts",
        );
      });

      it("should clean up no artifacts when given all root file paths", async () => {
        await solidity.cleanupArtifacts(await solidity.getRootFilePaths(), {
          scope: "contracts",
        });

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.deepEqual(
          actualArtifactPathsAfter,
          actualArtifactPathsBefore,
          "No artifacts should be cleaned up",
        );
      });

      it("should not clean up some of the artifacts when given a subset of all root file paths", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        const rootFilePathsToCleanUp = rootFilePaths.slice(
          0,
          rootFilePaths.length - 1,
        );

        await solidity.cleanupArtifacts(rootFilePathsToCleanUp, {
          scope: "contracts",
        });

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          actualArtifactPathsBefore.length > actualArtifactPathsAfter.length,
          "Some artifacts should be cleaned up",
        );
      });

      it("should clean up all the artifacts when given no root file paths", async () => {
        await solidity.cleanupArtifacts([], { scope: "contracts" });

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          actualArtifactPathsBefore.length > 0,
          "There should be some artifacts to clean up",
        );
        assert.deepEqual(
          actualArtifactPathsAfter,
          [],
          "All artifacts should be cleaned up",
        );
      });
    });

    describe("build", () => {
      let expectedArtifactPaths: string[];
      let expectedCachePaths: string[];

      before(async () => {
        expectedArtifactPaths = (
          await getAllFilesMatching(expectedArtifactsPath)
        ).map((f) => path.relative(expectedArtifactsPath, f));
        expectedCachePaths = (await getAllFilesMatching(expectedCachePath)).map(
          (f) => path.relative(expectedCachePath, f),
        );
      });

      it("should build the project deterministically", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        const actualArtifactPaths = (
          await getAllFilesMatching(actualArtifactsPath)
        ).map((f) => path.relative(actualArtifactsPath, f));
        const actualCachePaths = (
          await getAllFilesMatching(actualCachePath)
        ).map((f) => path.relative(actualCachePath, f));

        assert.deepEqual(
          actualArtifactPaths,
          expectedArtifactPaths,
          "Artifacts should be the same",
        );
        assert.deepEqual(
          actualCachePaths,
          expectedCachePaths,
          "Cache should be the same",
        );
      });

      it("should recompile the project when given the same input as in the previous call but the force flag is set", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        const runCompilationJobSpy = mock.method(solidity, "runCompilationJob");

        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        assert.equal(runCompilationJobSpy.mock.callCount(), 2);
      });

      it("should throw when given a build profile that is not defined", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();

        await assertRejectsWithHardhatError(
          solidity.build(rootFilePaths, {
            force: false,
            isolated: false,
            quiet: true,
            buildProfile: "not-defined",
          }),
          HardhatError.ERRORS.CORE.SOLIDITY.BUILD_PROFILE_NOT_FOUND,
          {
            buildProfileName: "not-defined",
          },
        );
      });
    });
  },
);
