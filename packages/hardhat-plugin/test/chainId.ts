/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe.skip("chain id", () => {
  useEnvironment("minimal");

  it("should have a chain id", async function () {
    await deployModule(this.hre, (m) => {
      const chainId = m.chainId;

      assert.equal(chainId, 31337);

      return {};
    });
  });
});
