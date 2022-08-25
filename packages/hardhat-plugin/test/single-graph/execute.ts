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

  describe("calls", () => {
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

    it("should be able to make calls in order", async function () {
      const result = await deployRecipe(this.hre, (m) => {
        const trace = m.contract("Trace", {
          args: ["first"],
        });

        const second = m.call(trace, "addEntry", {
          args: ["second"],
        });

        m.call(trace, "addEntry", {
          args: ["third"],
          after: [second],
        });

        return { trace };
      });

      assert.isDefined(result.trace);

      const entry1 = await result.trace.entries(0);
      const entry2 = await result.trace.entries(1);
      const entry3 = await result.trace.entries(2);

      assert.deepStrictEqual(
        [entry1, entry2, entry3],
        ["first", "second", "third"]
      );
    });
  });

  it("should be able to use an existing contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const firstResult = await deployRecipe(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      return { bar, usesContract };
    });

    assert.isDefined(firstResult.bar.address);
    assert.isDefined(firstResult.usesContract.address);
    const barAddress: string = firstResult.bar.address;
    const barAbi: any[] = firstResult.bar.abi;
    const usesContractAddress: string = firstResult.usesContract.address;
    const usesContractAbi: any[] = firstResult.usesContract.abi;

    const result = await deployRecipe(this.hre, (m) => {
      const bar = m.contractAt("Bar", barAddress, barAbi);
      const usesContract = m.contractAt(
        "UsesContract",
        usesContractAddress,
        usesContractAbi
      );

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

  it("should be able to use an artifact to deploy a contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const artifact = await this.hre.artifacts.readArtifact("Greeter");

    const result = await deployRecipe(this.hre, (m) => {
      const greeter = m.contract("Greeter", artifact, {
        args: ["Hello World"],
      });

      return { greeter };
    });

    assert.isDefined(result);

    const greeting = await result.greeter.getGreeting();

    assert.equal(greeting, "Hello World");
  });

  it("should be able to deploy a contract that depends on a hardhat library", async function () {
    await this.hre.run("compile", { quiet: true });

    const result = await deployRecipe(this.hre, (m) => {
      const rubbishMath = m.library("RubbishMath");
      const dependsOnLib = m.contract("DependsOnLib", {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { rubbishMath, dependsOnLib };
    });

    assert.isDefined(result);
    const math = result.rubbishMath;
    const contractThatDependsOnLib = result.dependsOnLib;

    const addition = await math.add(1, 2);
    assert.equal(addition, 3);

    const libBasedAddtion = await contractThatDependsOnLib.addThreeNumbers(
      1,
      2,
      3
    );

    assert.equal(libBasedAddtion, 6);
  });

  it("should be able to deploy a contract that depends on an artifact library", async function () {
    await this.hre.run("compile", { quiet: true });

    const libraryArtifact = await this.hre.artifacts.readArtifact(
      "RubbishMath"
    );

    const result = await deployRecipe(this.hre, (m) => {
      const rubbishMath = m.library("RubbishMath", libraryArtifact);
      const dependsOnLib = m.contract("DependsOnLib", {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { rubbishMath, dependsOnLib };
    });

    assert.isDefined(result);
    const math = result.rubbishMath;
    const contractThatDependsOnLib = result.dependsOnLib;

    const addition = await math.add(1, 2);
    assert.equal(addition, 3);

    const libBasedAddtion = await contractThatDependsOnLib.addThreeNumbers(
      1,
      2,
      3
    );

    assert.equal(libBasedAddtion, 6);
  });

  describe("recipe parameters", () => {
    it("should allow parameters", async function () {
      const result = await deployRecipe(
        this.hre,
        (m) => {
          const myNumber = m.getParam("MyNumber");

          const foo = m.contract("Foo");

          m.call(foo, "incByPositiveNumber", {
            args: [myNumber],
          });

          return { foo };
        },
        {
          parameters: {
            MyNumber: 123,
          },
        }
      );

      const v = await result.foo.x();

      assert.equal(v, Number(124));
    });
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
