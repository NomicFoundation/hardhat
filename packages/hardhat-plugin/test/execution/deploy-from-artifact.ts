/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useEphemeralIgnitionProject,
} from "../use-ignition-project";

/**
 * Deploy a contract from an artifact.
 */
describe("execution - deploy from artifact", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should deploy a contract that is callable", async function () {
    const fooArtifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = defineModule("FooModule", (m) => {
      const foo = m.contractFromArtifact("Foo", fooArtifact);

      return { foo };
    });

    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    assert.equal(await result.foo.x(), Number(1));
  });
});
