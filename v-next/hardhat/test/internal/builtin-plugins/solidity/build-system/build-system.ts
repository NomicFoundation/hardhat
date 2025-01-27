import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type {
  SolidityBuildInfoOutput,
  SolidityBuildSystem,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import {
  exists,
  getAllFilesMatching,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import {
  getTmpDir,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";

async function emitArtifacts(solidity: SolidityBuildSystem): Promise<void> {
  const rootFilePaths = await solidity.getRootFilePaths();
  const compilationJobs = await solidity.getCompilationJobs(rootFilePaths, {
    mergeCompilationJobs: true,
    quiet: false,
  });

  assert.ok(compilationJobs instanceof Map, "compilationJobs should be a Map");

  const artifactsPath = path.join(process.cwd(), "artifacts");

  const buildIds = new Set<string>();
  for (const compilationJob of compilationJobs.values()) {
    const buildId = compilationJob.getBuildId();
    if (!buildIds.has(buildId)) {
      buildIds.add(buildId);
      const buildInfoOutput = await readJsonFile<SolidityBuildInfoOutput>(
        path.join(
          artifactsPath,
          "build-info",
          `${compilationJob.getBuildId()}.output.json`,
        ),
      );
      await solidity.emitArtifacts(compilationJob, buildInfoOutput.output);
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
    let artifactsPath: string;
    let hre: HardhatRuntimeEnvironment;

    useFixtureProject("solidity/example-project");

    beforeEach(async () => {
      const tmpDir = await getTmpDir("solidity-build-system-implementation");
      artifactsPath = path.join(tmpDir, "artifacts");
      const cachePath = path.join(tmpDir, "cache");
      hre = await createHardhatRuntimeEnvironment({
        paths: {
          artifacts: artifactsPath,
          cache: cachePath,
        },
        solidity: {
          profiles: {
            default: {
              compilers: [
                {
                  version: "0.8.22",
                },
                {
                  version: "0.7.1",
                },
              ],
            },
          },
          remappings: ["remapped/=npm/@openzeppelin/contracts@5.1.0/access/"],
        },
      });
    });

    describe("emitArtifacts", () => {
      it("should successfully emit the artifacts", async () => {
        await emitArtifacts(hre.solidity);

        const expectedArtifactsPath = path.join(process.cwd(), "artifacts");

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
            artifactsPath,
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
      let artifactPathsBefore: string[];
      let duplicatedContractNamesDeclarationFilePath: string;

      beforeEach(async () => {
        await emitArtifacts(hre.solidity);
        artifactPathsBefore = await getAllFilesMatching(artifactsPath);
        duplicatedContractNamesDeclarationFilePath = path.join(
          artifactsPath,
          "artifacts.d.ts",
        );
      });

      it("should clean up no artifacts when given all root file paths", async () => {
        await hre.solidity.cleanupArtifacts(
          await hre.solidity.getRootFilePaths(),
        );

        const artifactPathsAfter = await getAllFilesMatching(
          artifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.deepEqual(
          artifactPathsAfter,
          artifactPathsBefore,
          "No artifacts should be cleaned up",
        );
      });

      it("should not clean up some of the artifacts when given a subset of all root file paths", async () => {
        const rootFilePaths = await hre.solidity.getRootFilePaths();
        const rootFilePathsToCleanUp = rootFilePaths.slice(
          0,
          rootFilePaths.length - 1,
        );

        await hre.solidity.cleanupArtifacts(rootFilePathsToCleanUp);

        const artifactPathsAfter = await getAllFilesMatching(
          artifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          artifactPathsBefore.length > artifactPathsAfter.length,
          "Some artifacts should be cleaned up",
        );
      });

      it("should clean up all the artifacts when given no root file paths", async () => {
        await hre.solidity.cleanupArtifacts([]);

        const artifactPathsAfter = await getAllFilesMatching(
          artifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          artifactPathsBefore.length > 0,
          "There should be some artifacts to clean up",
        );
        assert.deepEqual(
          artifactPathsAfter,
          [],
          "All artifacts should be cleaned up",
        );
      });
    });
  },
);
