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

    it("should be able to pass one contract as an after dependency of another", () => {
      const moduleWithDependentContracts = buildModule("Module1", (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another", [], { after: [example] });

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

    // TODO: determine whether this should throw due to id duplication
    // on the contract calls or whether we should auto-infer
    // the id as something like:
    //   Module1:SameContract:1
    //   Module1:SameContract:2
    it.skip("should be able to deploy the same contract twice", () => {
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract");
        const sameContract2 = m.contract("SameContract");

        return { sameContract1, sameContract2 };
      });

      assert.isDefined(moduleWithSameContractTwice);

      // Sets ids based on module id and contract name
      assert.equal(moduleWithSameContractTwice.id, "Module1");
      assert.equal(
        moduleWithSameContractTwice.results.sameContract1.id,
        "Module1:SameContract" // TODO: what should the id be here?
      );
      assert.equal(
        moduleWithSameContractTwice.results.sameContract2.id,
        "Module1:SameContract"
      );

      // 2 contract futures
      assert.equal(moduleWithSameContractTwice.futures.size, 2);
      assert.equal(
        [...moduleWithSameContractTwice.futures][0].type,
        FutureType.NAMED_CONTRACT_DEPLOYMENT
      );
      assert.equal(
        [...moduleWithSameContractTwice.futures][1].type,
        FutureType.NAMED_CONTRACT_DEPLOYMENT
      );

      // No submodules
      assert.equal(moduleWithSameContractTwice.submodules.size, 0);
    });
  });
});
