import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import {
  ArtifactManagerImplementation,
  BUILD_INFO_DIR_NAME,
} from "../../../../src/internal/builtin-plugins/artifacts/artifact-manager.js";

describe("ArtifactManagerImplementation", () => {
  useFixtureProject("artifacts/example-project");

  let hre: HardhatRuntimeEnvironment;
  let artifactManager: ArtifactManagerImplementation;
  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});

    await hre.tasks.getTask(["build"]).run({});

    artifactManager = new ArtifactManagerImplementation(
      hre.config.paths.artifacts,
    );
  });

  describe("getBuildInfoPath", () => {
    it("should return the path when build info file exists", async () => {
      const buildInfoId = await artifactManager.getBuildInfoId("Counter");

      assert.ok(
        buildInfoId !== undefined,
        "Expected build info id to be defined",
      );

      const expectedPath = path.join(
        hre.config.paths.artifacts,
        BUILD_INFO_DIR_NAME,
        buildInfoId + ".json",
      );

      const result = await artifactManager.getBuildInfoPath(buildInfoId);

      assert.equal(result, expectedPath);
    });

    it("should return undefined when build info file does not exist", async () => {
      const buildInfoId = "non-existent-build-info";

      const result = await artifactManager.getBuildInfoPath(buildInfoId);

      assert.equal(result, undefined);
    });
  });

  describe("getBuildInfoOutputPath", () => {
    it("should return the path when build info output file exists", async () => {
      const buildInfoId = await artifactManager.getBuildInfoId("Counter");

      assert.ok(
        buildInfoId !== undefined,
        "Expected build info id to be defined",
      );

      const expectedPath = path.join(
        hre.config.paths.artifacts,
        BUILD_INFO_DIR_NAME,
        buildInfoId + ".output.json",
      );

      const result = await artifactManager.getBuildInfoOutputPath(buildInfoId);

      assert.equal(result, expectedPath);
    });

    it("should return undefined when build info output file does not exist", async () => {
      const buildInfoId = "non-existent-output";

      const result = await artifactManager.getBuildInfoOutputPath(buildInfoId);

      assert.equal(result, undefined);
    });
  });
});
