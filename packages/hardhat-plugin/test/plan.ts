/* eslint-disable import/no-unused-modules */
import {
  buildRecipe,
  IRecipeGraphBuilder,
  FutureDict,
} from "@nomicfoundation/ignition-core";

import { mineBlocks } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("plan", () => {
  useEnvironment("minimal");

  it("should be able to deploy a contract", async function () {
    const result = await plan(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      m.call(usesContract, "setAddress", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    console.log(result);
  });
});

async function plan(
  hre: any,
  recipeDefinition: (m: IRecipeGraphBuilder) => FutureDict
): Promise<any> {
  await hre.run("compile", { quiet: true });

  const userRecipe = buildRecipe("MyRecipe", recipeDefinition);

  const planPromise = hre.ignition.plan(userRecipe);

  await mineBlocks(hre, [1, 1, 1], planPromise);

  const result = await planPromise;

  return result;
}
