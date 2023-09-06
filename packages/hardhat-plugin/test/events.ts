/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("events", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to use the output of a readEvent in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.readEventArgument(
        createCall,
        "Deployed",
        "fooAddress"
      );

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });

  it("should be able to use the output of a readEvent in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.readEventArgument(
        createCall,
        "Deployed",
        "fooAddress"
      );

      const foo = m.contractAtFromArtifact("Foo", newAddress, artifact);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });
});
