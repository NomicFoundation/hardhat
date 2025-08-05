import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtureProjectName = "minimal";
const deploymentDir = path.join(
  path.resolve(__dirname, `../fixture-projects/${fixtureProjectName}/ignition`),
  "deployments",
  "chain-31337",
);

describe("localhost deployment flag", function () {
  useEphemeralIgnitionProject(fixtureProjectName);

  beforeEach("clean filesystem", async function () {
    // make sure nothing is left over from a previous test
    await remove(deploymentDir);
  });

  afterEach("clean filesystem", async function () {
    // cleanup
    await remove(deploymentDir);
  });

  it("true should write deployment to disk", async function () {
    await this.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/OwnModule.js",
      writeLocalhostDeployment: true,
    });

    assert(await exists(deploymentDir), "Deployment was not written to disk");
  });

  it("false should not write deployment to disk", async function () {
    await this.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/OwnModule.js",
      writeLocalhostDeployment: false,
    });

    assert(
      !(await exists(deploymentDir)),
      "Deployment was not written to disk",
    );
  });
});
