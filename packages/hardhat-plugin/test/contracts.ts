/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("contract deploys", () => {
  useEnvironment("minimal");

  it("should be able to deploy a contract", async function () {
    const result = await deployModule(this.hre, (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    assert.isDefined(result);

    const x = await result.foo.x();

    assert.equal(x, Number(1));
  });

  it("should be able to deploy a contract with arguments", async function () {
    const result = await deployModule(this.hre, (m) => {
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
    const result = await deployModule(this.hre, (m) => {
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

  it("should be able to deploy contracts without dependencies", async function () {
    const result = await deployModule(this.hre, (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    assert.isDefined(result);

    const x = await result.foo.x();
    const isBar = await result.bar.isBar();

    assert.equal(x, Number(1));
    assert.equal(isBar, true);
  });

  it("should be able to use an artifact to deploy a contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const artifact = await this.hre.artifacts.readArtifact("Greeter");

    const result = await deployModule(this.hre, (m) => {
      const greeter = m.contract("Greeter", artifact, {
        args: ["Hello World"],
      });

      return { greeter };
    });

    assert.isDefined(result);

    const greeting = await result.greeter.getGreeting();

    assert.equal(greeting, "Hello World");
  });
});
