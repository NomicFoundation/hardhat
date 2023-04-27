/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { NamedContractDeploymentFutureImplementation } from "../../src/new-api/internal/module";
import { FutureType } from "../../src/new-api/types/module";

describe("new api", () => {
  describe("contract", () => {
    it("should be able to setup a deploy contract call", () => {
      const moduleWithASingleContract = buildModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      assert.isDefined(moduleWithASingleContract);

      // Sets ids based on module id and contract name
      assert.equal(moduleWithASingleContract.id, "Module1");
      assert.equal(
        moduleWithASingleContract.results.contract1.id,
        "Module1:Contract1"
      );

      // 1 contract future
      assert.equal(moduleWithASingleContract.futures.size, 1);
      assert.equal(
        [...moduleWithASingleContract.futures][0].type,
        FutureType.NAMED_CONTRACT_DEPLOYMENT
      );

      // No submodules
      assert.equal(moduleWithASingleContract.submodules.size, 0);
    });

    it("should be able to pass one contract as an arg dependency to another", () => {
      const moduleWithDependentContracts = buildModule("Module1", (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another", [example]);

        return { example, another };
      });

      assert.isDefined(moduleWithDependentContracts);

      const exampleFuture = [...moduleWithDependentContracts.futures].find(
        ({ id }) => id === "Module1:Example"
      );

      const anotherFuture = [...moduleWithDependentContracts.futures].find(
        ({ id }) => id === "Module1:Another"
      );

      if (
        !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
      ) {
        assert.fail("Not a named contract deployment");
      }

      assert.equal(anotherFuture.dependencies.size, 1);
      assert(anotherFuture.dependencies.has(exampleFuture!));
    });
  });
});
