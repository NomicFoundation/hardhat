import {
  buildRecipeSingleGraph,
  IRecipeGraphBuilder,
  FutureDict,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { mineBlocks } from "../helpers";
import { useEnvironment } from "../useEnvironment";

describe("single graph version", () => {
  useEnvironment("minimal");

  it("should be able to deploy a contract", async function () {
    const result = await deployRecipe(this.hre, (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    assert.isDefined(result);

    const x = await result.foo.x();

    assert.equal(x, Number(1));
  });

  it("should be able to deploy a contract with arguments", async function () {
    const result = await deployRecipe(this.hre, (m) => {
      const greeter = m.contract("Greeter", {
        args: ["Hello World"],
      });

      return { greeter };
    });

    assert.isDefined(result);

    const greeting = await result.greeter.getGreeting();

    assert.equal(greeting, "Hello World");
  });

  it("should be able to deploy contracts with dependencies", async function () {
    const result = await deployRecipe(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });

  it("should be able to call contracts", async function () {
    const result = await deployRecipe(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      m.call(usesContract, "setAddress", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });
});

async function deployRecipe(
  hre: any,
  recipeDefinition: (m: IRecipeGraphBuilder) => FutureDict,
  options?: { parameters: {} }
): Promise<any> {
  await hre.run("compile", { quiet: true });

  const userRecipe = buildRecipeSingleGraph("MyRecipe", recipeDefinition);

  const deployPromise = hre.ignition.deploySingleGraph(userRecipe, options);

  await mineBlocks(hre, [1, 1, 1], deployPromise);

  const result = await deployPromise;

  return result;
}
