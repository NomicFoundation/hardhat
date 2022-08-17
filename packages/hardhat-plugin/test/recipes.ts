import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployRecipes,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("recipes", () => {
  useEnvironment("minimal");

  it("should deploy two recipes", async function () {
    // given
    const userRecipe1 = buildRecipe("MyRecipe1", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });
    const userRecipe2 = buildRecipe("MyRecipe2", (m) => {
      const { foo } = m.useRecipe(userRecipe1);

      m.call(foo, "inc");
    });

    // when
    const deploymentResult = await deployRecipes(
      this.hre,
      [userRecipe2, userRecipe1],
      [1, 1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyRecipe1: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 2);
        }),
      },
      MyRecipe2: {
        "Foo.inc": resultAssertions.transaction(),
      },
    });
  });
});
