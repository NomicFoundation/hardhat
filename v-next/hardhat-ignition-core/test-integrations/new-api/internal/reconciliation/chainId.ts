import { assert } from "chai";

import { useHardhatProject } from "../../../helpers/hardhat-projects.js";

describe("chainId reconciliation", function () {
  this.timeout(60000);

  useHardhatProject("default-with-new-chain-id");

  it("should halt when running a deployment on a different chain", async function () {
    this.hre.network.name = "something-else";
    process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "true";

    await assert.isRejected(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/LockModule.js",
        }
      ),
      /The deployment's chain cannot be changed between runs. The deployment was previously run against the chain 123, but the current network is the chain 1337./
    );

    delete process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT;
  });
});
