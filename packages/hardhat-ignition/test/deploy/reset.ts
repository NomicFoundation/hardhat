import assert from "node:assert/strict";
import path, { dirname } from "node:path";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { fileURLToPath } from "node:url";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { remove } from "@nomicfoundation/hardhat-utils/fs";
import { status } from "@nomicfoundation/ignition-core";

import { HardhatArtifactResolver } from "../../src/helpers/hardhat-artifact-resolver.js";
import { useFileIgnitionProject } from "../test-helpers/use-ignition-project.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const deploymentId = "custom-reset-id";
const deploymentDir = path.join(
  path.resolve(__dirname, `../fixture-projects/${deploymentId}/ignition`),
  "deployments",
  "chain-31337",
);

describe("reset flag", function () {
  const project = useFileIgnitionProject("reset-flag", deploymentId);

  beforeEach(async function () {
    // make sure nothing is left over from a previous test
    await remove(deploymentDir);
  });

  afterEach(async function () {
    // cleanup
    await remove(deploymentDir);
  });

  before(async function () {
    process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "false";
    process.env.HARDHAT_IGNITION_CONFIRM_RESET = "false";
  });

  it("should reset a deployment", async function () {
    await project.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/FirstPass.js",
      deploymentId,
      writeLocalhostDeployment: true,
      reset: false,
    });

    await project.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/SecondPass.js",
      deploymentId,
      writeLocalhostDeployment: true,
      reset: true,
    });

    const artifactResolver = new HardhatArtifactResolver(project.hre.artifacts);

    assertHardhatInvariant(
      project.deploymentDir !== undefined,
      "Deployment dir is undefined",
    );
    const result = await status(project.deploymentDir, artifactResolver);

    // ResetModule#B will only be in the success list if the second
    // run ran without any reconciliation errors - so the retry
    // cleared the first pass
    assert(
      result.successful.includes("ResetModule#B"),
      "Retry did not clear first pass, so second pass failed",
    );
  });
});
