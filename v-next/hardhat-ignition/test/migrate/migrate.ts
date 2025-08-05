import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import path from "node:path";

import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { assert } from "chai";

import taskMigrate from "../../src/internal/tasks/migrate.js";
import { useProject } from "../test-helpers/use-ignition-project.js";

describe("migrate", function () {
  describe("success", function () {
    useProject("migrate-artifacts");

    it("should migrate old artifacts and build-info to the new format", async function () {
      await taskMigrate({ deploymentId: "test-id" }, {
        config: { paths: { ignition: "ignition" } },
      } as HardhatRuntimeEnvironment);

      const deploymentPath = path.join("ignition", "deployments", "test-id");
      const artifactsPath = path.join(deploymentPath, "artifacts");
      const buildInfoPath = path.join(deploymentPath, "build-info");

      const v3Artifact = await readJsonFile(
        path.join(deploymentPath, "v3-artifact.json"),
      );
      const updatedArtifact = await readJsonFile(
        path.join(artifactsPath, "LockModule#Lock.json"),
      );

      const v3BuildInfo = await readJsonFile(
        path.join(deploymentPath, "v3-build-info.json"),
      );
      const updatedBuildInfo = await readJsonFile(
        path.join(
          buildInfoPath,
          "solc-0_8_28-ad47b6fd82fea4f651540333f2a0887a.json",
        ),
      );

      assert.deepEqual(updatedArtifact, v3Artifact);
      assert.deepEqual(updatedBuildInfo, v3BuildInfo);
    });
  });

  describe("migrating contracts that share a build info file", function () {
    useProject("migrate-common-build-info");

    it("should migrate old artifacts and build-info to the new format", async function () {
      await taskMigrate({ deploymentId: "test-id" }, {
        config: { paths: { ignition: "ignition" } },
      } as HardhatRuntimeEnvironment);

      const deploymentPath = path.join("ignition", "deployments", "test-id");
      const artifactsPath = path.join(deploymentPath, "artifacts");
      const buildInfoPath = path.join(deploymentPath, "build-info");

      const v3ArtifactA = await readJsonFile(
        path.join(deploymentPath, "v3-artifact-A.json"),
      );
      const updatedArtifactA = await readJsonFile(
        path.join(artifactsPath, "SimpleModule#A.json"),
      );

      const v3ArtifactB = await readJsonFile(
        path.join(deploymentPath, "v3-artifact-B.json"),
      );
      const updatedArtifactB = await readJsonFile(
        path.join(artifactsPath, "SimpleModule#B.json"),
      );

      const v3BuildInfo = await readJsonFile(
        path.join(deploymentPath, "v3-build-info.json"),
      );
      const updatedBuildInfo = await readJsonFile(
        path.join(
          buildInfoPath,
          "solc-0_8_28-65860e589a9467319db576328b26eea6.json",
        ),
      );

      assert.deepEqual(updatedArtifactA, v3ArtifactA);
      assert.deepEqual(updatedArtifactB, v3ArtifactB);
      assert.deepEqual(updatedBuildInfo, v3BuildInfo);
    });
  });

  describe("migrating without build-info", function () {
    useProject("migrate-without-artifacts");

    it("should migrate old artifacts to the new format", async function () {
      await taskMigrate({ deploymentId: "test-id" }, {
        config: { paths: { ignition: "ignition" } },
      } as HardhatRuntimeEnvironment);

      const deploymentPath = path.join("ignition", "deployments", "test-id");
      const artifactsPath = path.join(deploymentPath, "artifacts");

      const v3Artifact = await readJsonFile(
        path.join(deploymentPath, "v3-artifact.json"),
      );
      const updatedArtifact = await readJsonFile(
        path.join(artifactsPath, "LockModule#Lock.json"),
      );

      assert.deepEqual(updatedArtifact, v3Artifact);
    });
  });

  describe("nothing to migrate", function () {
    useProject("migrate-artifacts-v3");

    it("should not migrate artifacts and build-info that are already in the new format", async function () {
      await taskMigrate({ deploymentId: "test-id" }, {
        config: { paths: { ignition: "ignition" } },
      } as HardhatRuntimeEnvironment);

      const deploymentPath = path.join("ignition", "deployments", "test-id");
      const artifactsPath = path.join(deploymentPath, "artifacts");
      const buildInfoPath = path.join(deploymentPath, "build-info");

      const v3Artifact = await readJsonFile(
        path.join(deploymentPath, "v3-artifact.json"),
      );
      const updatedArtifact = await readJsonFile(
        path.join(artifactsPath, "LockModule#Lock.json"),
      );

      const v3BuildInfo = await readJsonFile(
        path.join(deploymentPath, "v3-build-info.json"),
      );
      const updatedBuildInfo = await readJsonFile(
        path.join(
          buildInfoPath,
          "solc-0_8_28-ad47b6fd82fea4f651540333f2a0887a.json",
        ),
      );

      assert.deepEqual(updatedArtifact, v3Artifact);
      assert.deepEqual(updatedBuildInfo, v3BuildInfo);
    });
  });
});
