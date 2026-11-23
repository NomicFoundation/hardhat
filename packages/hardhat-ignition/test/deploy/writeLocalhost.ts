import assert from "node:assert/strict";
import path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";

import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

const fixtureProjectName = "minimal";
// Relative to the test's copy of the fixture project, the working directory.
const deploymentDir = path.join("ignition", "deployments", "chain-31337");

describe("localhost deployment flag", function () {
  const project = useEphemeralIgnitionProject(fixtureProjectName);

  beforeEach(async function () {
    // make sure nothing is left over from a previous test
    await remove(deploymentDir);
  });

  afterEach(async function () {
    // cleanup
    await remove(deploymentDir);
  });

  it("true should write deployment to disk", async function () {
    await project.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/OwnModule.js",
      writeLocalhostDeployment: true,
    });

    assert(await exists(deploymentDir), "Deployment was not written to disk");
  });

  it("false should not write deployment to disk", async function () {
    await project.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/OwnModule.js",
      writeLocalhostDeployment: false,
    });

    assert(
      !(await exists(deploymentDir)),
      "Deployment was not written to disk",
    );
  });
});
