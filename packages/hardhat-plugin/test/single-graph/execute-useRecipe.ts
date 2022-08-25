import {
  buildRecipeSingleGraph,
  IRecipeGraphBuilder,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { mineBlocks } from "../helpers";
import { useEnvironment } from "../useEnvironment";

describe("useRecipe", () => {
  useEnvironment("minimal");

  it("should be able to use contracts created in other recipes", async function () {
    await this.hre.run("compile", { quiet: true });

    const thirdPartyRecipe = buildRecipeSingleGraph(
      "ThirdPartyRecipe",
      (m: IRecipeGraphBuilder) => {
        const foo = m.contract("Foo");

        return { foo };
      }
    );

    const userRecipe = buildRecipeSingleGraph(
      "UserRecipe",
      (m: IRecipeGraphBuilder) => {
        const { foo } = m.useRecipe(thirdPartyRecipe);

        m.call(foo as any, "inc", {
          args: [],
        });

        return { foo };
      }
    );

    const deployPromise = this.hre.ignition.deploySingleGraph(userRecipe, {
      parameters: {},
    });

    await mineBlocks(this.hre, [1, 1, 1], deployPromise);

    const result = await deployPromise;

    assert.isDefined(result);

    const x = await result.foo.x();

    assert.equal(x, Number(2));
  });

  it("should be able to pass contract futures into another recipe", async function () {
    await this.hre.run("compile", { quiet: true });

    const thirdPartyRecipe = buildRecipeSingleGraph(
      "ThirdPartyRecipe",
      (m: IRecipeGraphBuilder) => {
        const foo = m.getParam("Foo");

        m.call(foo as any, "inc", {
          args: [],
        });

        return { foo };
      }
    );

    const userRecipe = buildRecipeSingleGraph(
      "UserRecipe",
      (m: IRecipeGraphBuilder) => {
        const foo = m.contract("Foo");

        m.useRecipe(thirdPartyRecipe, {
          parameters: {
            Foo: foo as any,
          },
        });

        return { foo };
      }
    );

    const deployPromise = this.hre.ignition.deploySingleGraph(userRecipe, {
      parameters: {},
    });

    await mineBlocks(this.hre, [1, 1, 1], deployPromise);

    const result = await deployPromise;

    assert.isDefined(result);

    const x = await result.foo.x();

    assert.equal(x, Number(2));
  });
});
