import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { randomUUID } from "node:crypto";
import { cpSync } from "node:fs";
import path from "node:path";

import { readJsonFile, remove } from "@nomicfoundation/hardhat-utils/fs";
import { assert } from "chai";

import taskMigrate from "../../src/internal/tasks/migrate.js";

describe("migrate", function () {
  describe("success", function () {
    const basePath = path.resolve(
      import.meta.dirname,
      "..",
      "fixture-projects",
    );
    const tmpProjectPath = path.join("tmp", randomUUID());
    let prevWorkingDir: string;

    // todo: whenever these tests are migrated to node:test,
    // we should use `useEphemeralFixtureProject` from hardhat-test-utils here instead
    before(function () {
      cpSync(
        path.join(basePath, "migrate-artifacts"),
        path.join(basePath, tmpProjectPath),
        {
          recursive: true,
          force: true,
        },
      );

      prevWorkingDir = process.cwd();
      process.chdir(path.join(basePath, tmpProjectPath));
    });

    after(async () => {
      process.chdir(prevWorkingDir);
      await remove(path.join(basePath, tmpProjectPath));
    });

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
        path.join(buildInfoPath, "ad47b6fd82fea4f651540333f2a0887a.json"),
      );

      assert.deepEqual(updatedArtifact, v3Artifact);
      assert.deepEqual(updatedBuildInfo, v3BuildInfo);
    });
  });

  describe("nothing to migrate", function () {
    const basePath = path.resolve(
      import.meta.dirname,
      "..",
      "fixture-projects",
    );
    const tmpProjectPath = path.join("tmp", randomUUID());
    let prevWorkingDir: string;

    // todo: whenever these tests are migrated to node:test,
    // we should use `useEphemeralFixtureProject` from hardhat-test-utils here instead
    before(function () {
      cpSync(
        path.join(basePath, "migrate-artifacts-v3"),
        path.join(basePath, tmpProjectPath),
        {
          recursive: true,
          force: true,
        },
      );

      prevWorkingDir = process.cwd();
      process.chdir(path.join(basePath, tmpProjectPath));
    });

    after(async () => {
      process.chdir(prevWorkingDir);
      await remove(path.join(basePath, tmpProjectPath));
    });

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
        path.join(buildInfoPath, "ad47b6fd82fea4f651540333f2a0887a.json"),
      );

      assert.deepEqual(updatedArtifact, v3Artifact);
      assert.deepEqual(updatedBuildInfo, v3BuildInfo);
    });
  });
});
