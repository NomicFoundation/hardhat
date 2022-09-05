import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { deployRecipes } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("chain id", () => {
  useEnvironment("minimal");

  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip("should be available on the recipe builder", async function () {
    // given
    const chainIdRecipe = buildRecipe("MyRecipe", (m) => {
      assert.equal(m.chainId, 31337);
    });

    await deployRecipes(this.hre, [chainIdRecipe], [1, 1]);
  });
});
