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

  describe("getAllArtifactPaths", () => {
    it("should return all artifact paths", async () => {
      const artifactPaths = await artifactManager.getAllArtifactPaths();

      // Should have exactly one artifact (Counter)
      assert.equal(artifactPaths.size, 1, "Should have exactly one artifact");

      // Check the path is correct
      const expectedPath = path.join(
        hre.config.paths.artifacts,
        "contracts",
        "Counter.sol",
        "Counter.json",
      );
      assert.ok(
        artifactPaths.has(expectedPath) === true,
        `Expected artifact path ${expectedPath} to be in the set`,
      );
    });
  });

  describe("artifactExists", () => {
    it("should return true for an existing bare name", async () => {
      const result = await artifactManager.artifactExists("Counter");
      assert.equal(result, true);
    });

    it("should return true for an existing fully-qualified name", async () => {
      const result = await artifactManager.artifactExists(
        "contracts/Counter.sol:Counter",
      );
      assert.equal(result, true);
    });

    it("should return false for a missing bare name", async () => {
      const result = await artifactManager.artifactExists("NonExistent");
      assert.equal(result, false);
    });

    it("should return false for a missing fully-qualified name", async () => {
      const result = await artifactManager.artifactExists(
        "contracts/NonExistent.sol:NonExistent",
      );
      assert.equal(result, false);

      const result2 = await artifactManager.artifactExists(
        "contracts/Counter.sol:NonExistent",
      );
      assert.equal(result2, false);
    });
  });
});

describe("ArtifactManagerImplementation - duplicate bare names", () => {
  useFixtureProject("artifacts/duplicate-names-project");

  let hre: HardhatRuntimeEnvironment;
  let artifactManager: ArtifactManagerImplementation;
  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});

    await hre.tasks.getTask(["build"]).run({});

    artifactManager = new ArtifactManagerImplementation(
      hre.config.paths.artifacts,
    );
  });

  describe("artifactExists", () => {
    it("should return true and not throw when multiple artifacts share the same bare name", async () => {
      const result = await artifactManager.artifactExists("Foo");
      assert.equal(result, true);
    });

    it("should return true for each fully-qualified name individually", async () => {
      const resultA = await artifactManager.artifactExists(
        "contracts/a/Foo.sol:Foo",
      );
      const resultB = await artifactManager.artifactExists(
        "contracts/b/Foo.sol:Foo",
      );
      assert.equal(resultA, true);
      assert.equal(resultB, true);
    });
  });
});
