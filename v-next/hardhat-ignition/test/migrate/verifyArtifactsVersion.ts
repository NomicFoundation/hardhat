import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { verifyArtifactsVersion } from "../../src/internal/utils/verifyArtifactsVersion.js";

describe("verifyArtifactsVersion", function () {
  it("should return when the deploymentDir is undefined or nonexistent", async function () {
    assert.isFulfilled(verifyArtifactsVersion(undefined));
    assert.isFulfilled(verifyArtifactsVersion("nonexistent"));
  });

  it("should throw an error if an artifact is in the old format", async function () {
    const deploymentDir = path.resolve(
      import.meta.dirname,
      "..",
      "fixture-projects",
      "migrate-artifacts",
      "ignition",
      "deployments",
      "test-id",
    );

    await assertRejectsWithHardhatError(
      verifyArtifactsVersion(deploymentDir),
      HardhatError.ERRORS.IGNITION.GENERAL.ARTIFACT_MIGRATION_NEEDED,
      { deploymentId: "test-id" },
    );
  });
});
