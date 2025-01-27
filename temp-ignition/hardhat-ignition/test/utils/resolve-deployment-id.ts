import { assert } from "chai";

import { resolveDeploymentId } from "../../src/utils/resolve-deployment-id";

describe("deploy id rules", () => {
  const exampleChainId = 31337;

  it("should use the user provided id if one is provided", () => {
    const deploymentId = resolveDeploymentId(
      "my-deployment-id",
      exampleChainId
    );

    assert.equal(deploymentId, "my-deployment-id");
  });

  it("should generate a default id based on the chainId if the user provided no deploymentId", () => {
    const deploymentId = resolveDeploymentId(undefined, exampleChainId);

    assert.equal(deploymentId, "chain-31337");
  });

  it("should throw if the user provided an invalid deploymentId", () => {
    assert.throws(() => {
      resolveDeploymentId("deployment/test", exampleChainId);
    }, /The deployment-id "deployment\/test" contains banned characters, ids can only contain alphanumerics, dashes or underscores/);
  });
});
