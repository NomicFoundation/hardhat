/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { deployRecipe } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("single graph version", () => {
  useEnvironment("minimal");

  it("should have a chain id", async function () {
    await deployRecipe(this.hre, (m) => {
      const chainId = m.chainId;

      assert.equal(chainId, 31337);

      return {};
    });
  });
});
