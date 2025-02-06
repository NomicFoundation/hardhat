/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("verify", function () {
  describe("when there is no etherscan API key configured", function () {
    useEphemeralIgnitionProject("verify-no-api-key");

    it("should throw in the verify task", async function () {
      await assert.isRejected(
        this.hre.run(
          { scope: "ignition", task: "verify" },
          {
            deploymentId: "test",
          },
        ),
        /No etherscan API key configured/,
      );
    });

    it("should throw in the deploy task", async function () {
      await assert.isRejected(
        this.hre.run(
          { scope: "ignition", task: "deploy" },
          {
            modulePath: "any",
            verify: true,
          },
        ),
        /No etherscan API key configured/,
      );
    });
  });
});
