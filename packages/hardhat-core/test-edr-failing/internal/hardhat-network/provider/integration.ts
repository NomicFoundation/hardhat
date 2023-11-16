import { assert } from "chai";
import fsExtra from "fs-extra";

import { useEnvironment } from "../../../helpers/environment";
import { useFixtureProject } from "../../../helpers/project";

describe("Provider integration tests", function () {
  describe("Solidity stack traces", function () {
    useFixtureProject("solidity-stack-traces-integration");
    useEnvironment();

    it("Should compile", async function () {
      await this.env.run("compile");
      const artifact = await fsExtra.readJSON(
        "artifacts/contracts/Contract.sol/Contract.json"
      );

      try {
        await this.env.network.provider.send("eth_sendTransaction", [
          {
            data: artifact.bytecode,
          },
        ]);
      } catch (error: any) {
        assert.include(error.stack, "Contract.sol:");

        // These exceptions should not have a code property, or Ethereum libs
        // treat them as JSON-RPC responses, capturing them and loosing their
        // stack trace.
        assert.isUndefined(error.code);

        return;
      }

      assert.fail("Exception expected but not thrown");
    });
  });
});
