import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  assertDeploymentState,
  deployRecipes,
  resultAssertions,
} from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("contract calls", () => {
  useEnvironment("minimal");

  it("should call a function in a contract", async function () {
    // given
    const userRecipe = buildRecipe("MyRecipe", (m) => {
      const foo = m.contract("Foo");
      m.call(foo, "inc");
    });

    // when
    const deploymentResult = await deployRecipes(
      this.hre,
      [userRecipe],
      [1, 1]
    );

    // then
    await assertDeploymentState(this.hre, deploymentResult, {
      MyRecipe: {
        Foo: resultAssertions.contract(async (foo) => {
          assert.isTrue(await foo.isFoo());
          assert.equal(await foo.x(), 2);
        }),
        "Foo.inc": resultAssertions.transaction(),
      },
    });
  });

  it("should fail if a call fails", async function () {
    // given
    const userRecipe = buildRecipe("MyRecipe", (m) => {
      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", {
        args: [0],
      });
    });

    // then
    await assert.isRejected(deployRecipes(this.hre, [userRecipe], [1, 1]));
  });
});
