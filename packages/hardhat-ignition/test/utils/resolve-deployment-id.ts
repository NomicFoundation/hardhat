import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { resolveDeploymentId } from "../../src/helpers/resolve-deployment-id.js";

describe("deploy id rules", () => {
  const exampleChainId = 31337;

  it("should use the user provided id if one is provided", () => {
    const deploymentId = resolveDeploymentId(
      "my-deployment-id",
      exampleChainId,
    );

    assert.equal(deploymentId, "my-deployment-id");
  });

  it("should generate a default id based on the chainId if the user provided no deploymentId", () => {
    const deploymentId = resolveDeploymentId(undefined, exampleChainId);

    assert.equal(deploymentId, "chain-31337");
  });

  it("should throw if the user provided an invalid deploymentId", () => {
    assertThrowsHardhatError(
      () => {
        resolveDeploymentId("deployment/test", exampleChainId);
      },
      HardhatError.ERRORS.IGNITION.INTERNAL.INVALID_DEPLOYMENT_ID,
      { deploymentId: "deployment/test" },
    );
  });
});
