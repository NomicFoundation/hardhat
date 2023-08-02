/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useEphemeralIgnitionProject,
} from "../use-ignition-project";

/**
 * Use an existingly deployed contract through the `contractAtFromArtifact` api.
 *
 * First deploy a working contract, then reuse it from a subsequent module
 * with a passed in artifact.
 */
describe("execution - deploy contractAt from artifact", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should deploy a contract that is callable", async function () {
    // Arrange
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    const fooAddress = result.foo.address;
    assert.equal(fooAddress, "0x5FbDB2315678afecb367f032d93F642f64180aa3");

    // Act
    const fooArtifact = await this.hre.artifacts.readArtifact("Foo");

    const contractAtModuleDefinition = buildModule("FooModule", (m) => {
      const atFoo = m.contractAtFromArtifact("AtFoo", fooAddress, fooArtifact);

      return { atFoo };
    });

    const contractAtFromArtifactResult = await this.deploy(
      contractAtModuleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    // Assert
    assert.equal(await contractAtFromArtifactResult.atFoo.x(), Number(1));
  });
});
