import { assert } from "chai";
import { pathExists, removeSync } from "fs-extra";
import path from "path";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

const fixtureProjectName = "minimal";
const deploymentDir = path.join(
  path.resolve(__dirname, `../fixture-projects/${fixtureProjectName}/ignition`),
  "deployments",
  "chain-31337"
);

describe("localhost deployment flag", function () {
  useEphemeralIgnitionProject(fixtureProjectName);

  beforeEach("clean filesystem", async function () {
    // make sure nothing is left over from a previous test
    removeSync(deploymentDir);
  });
  afterEach("clean filesystem", function () {
    // cleanup
    removeSync(deploymentDir);
  });

  it("true should write deployment to disk", async function () {
    await this.hre.run(
      { scope: "ignition", task: "deploy" },
      {
        modulePath: "./ignition/modules/OwnModule.js",
        writeLocalhostDeployment: true,
      }
    );

    assert(
      await pathExists(deploymentDir),
      "Deployment was not written to disk"
    );
  });

  it("false should not write deployment to disk", async function () {
    await this.hre.run(
      { scope: "ignition", task: "deploy" },
      {
        modulePath: "./ignition/modules/OwnModule.js",
        writeLocalhostDeployment: false,
      }
    );

    assert(
      !(await pathExists(deploymentDir)),
      "Deployment was not written to disk"
    );
  });
});
