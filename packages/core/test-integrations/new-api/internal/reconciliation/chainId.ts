import { assert } from "chai";

import { useHardhatProject } from "../../../helpers/hardhat-projects";

describe("chainId reconciliation", () => {
  useHardhatProject("default-with-new-chain-id");

  it("should halt when running a deployment on a different chain", async function () {
    this.hre.network.name = "something-else";

    await assert.isRejected(
      this.hre.run("deploy", { moduleNameOrPath: "./ignition/LockModule.js" }),
      /Previous chain id: 123\. Current chain id: 31337/
    );
  });
});
