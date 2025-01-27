import { assert } from "chai";
import path from "path";

import { listDeployments } from "../src/index.js";

describe("listDeployments", () => {
  it("should return an empty array if given a directory that doesn't exist", async () => {
    const result = await listDeployments("nonexistant");

    assert.deepEqual(result, []);
  });

  it("should return an empty array if given a directory containing no deployments", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "listDeployments",
      "no-deployments",
    );

    const result = await listDeployments(deploymentDir);

    assert.deepEqual(result, []);
  });

  it("should return an array of deployment IDs if given a directory containing deployments", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "listDeployments",
      "has-deployments",
    );

    const result = await listDeployments(deploymentDir);

    assert.deepEqual(result, ["chain-1", "chain-2"]);
  });
});
