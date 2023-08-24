/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

// eslint-disable-next-line no-only-tests/no-only-tests
describe.only("contract deploys", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should be able to deploy a contract", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), Number(1));
  });

  it("should be able to deploy a contract with arguments", async function () {
    const moduleDefinition = buildModule("GreeterModule", (m) => {
      const greeter = m.contract("Greeter", ["Hello World"]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition);

    const greeting = await result.greeter.getGreeting();
    assert.equal(greeting, "Hello World");
  });

  it.skip("should be able to deploy contracts with dependencies", async function () {
    const moduleDefinition = buildModule("DependentModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [bar]);

      return { bar, usesContract };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });

  it("should be able to deploy contracts without dependencies", async function () {
    const moduleDefinition = buildModule("WithoutDepModule", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    const result = await this.deploy(moduleDefinition);

    const x = await result.foo.x();
    const isBar = await result.bar.isBar();

    assert.equal(x, Number(1));
    assert.equal(isBar, true);
  });

  it("should be able to use an artifact to deploy a contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const artifact = await this.hre.artifacts.readArtifact("Greeter");

    const moduleDefinition = buildModule("ArtifactModule", (m) => {
      const greeter = m.contractFromArtifact("Greeter", artifact, [
        "Hello World",
      ]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition);

    const greeting = await result.greeter.getGreeting();
    assert.equal(greeting, "Hello World");
  });

  describe("with endowment", () => {
    it.skip("should be able to deploy a contract with an endowment", async function () {
      const moduleDefinition = buildModule("EndowmentModule", (m) => {
        const passingValue = m.contract("PassingValue", [], {
          value: BigInt(this.hre.ethers.utils.parseEther("1").toString()),
        });

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await this.hre.ethers.provider.getBalance(
        result.passingValue.address
      );

      assert.equal(
        actualInstanceBalance.toString(),
        this.hre.ethers.utils.parseEther("1").toString()
      );
    });

    // TODO: bring this back once parameters for value enabled
    it.skip("should be able to deploy a contract with an endowment via a parameter", async function () {
      const submoduleDefinition = buildModule("submodule", (m) => {
        const endowment = m.getParameter(
          "endowment",
          BigInt(this.hre.ethers.utils.parseEther("2").toString())
        );

        const passingValue = m.contract("PassingValue", [], {
          value: endowment as any,
        });

        return { passingValue };
      });

      const moduleDefinition = buildModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await this.hre.ethers.provider.getBalance(
        result.passingValue.address
      );

      assert.equal(
        actualInstanceBalance.toString(),
        this.hre.ethers.utils.parseEther("1").toString()
      );
    });
  });
});
