/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";

describe("contractAt", () => {
  const fakeArtifact: any = {};

  it("should be able to setup a contract at a given address", () => {
    const moduleWithContractFromArtifact = buildModule("Module1", (m) => {
      const contract1 = m.contractAt("Contract1", "0xtest", fakeArtifact);

      return { contract1 };
    });

    assert.isDefined(moduleWithContractFromArtifact);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithContractFromArtifact.id, "Module1");
    assert.equal(
      moduleWithContractFromArtifact.results.contract1.id,
      "Module1:Contract1"
    );

    // Stores the address
    assert.deepStrictEqual(
      moduleWithContractFromArtifact.results.contract1.address,
      "0xtest"
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an after dependency", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contractAt("Another", "0xtest", fakeArtifact, {
        after: [example],
      });

      return { example, another };
    });

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  describe("passing id", () => {
    it("should use contract at twice by passing an id", () => {
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contractAt(
          "SameContract",
          "0xtest",
          fakeArtifact,
          {
            id: "first",
          }
        );
        const sameContract2 = m.contractAt(
          "SameContract",
          "0xtest",
          fakeArtifact,
          {
            id: "second",
          }
        );

        return { sameContract1, sameContract2 };
      });

      // Sets ids based on module id and contract name
      assert.equal(moduleWithSameContractTwice.id, "Module1");
      assert.equal(
        moduleWithSameContractTwice.results.sameContract1.id,
        "Module1:first"
      );
      assert.equal(
        moduleWithSameContractTwice.results.sameContract2.id,
        "Module1:second"
      );
    });

    it("should throw if the same contract is deployed twice without differentiating ids", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.contractAt(
            "SameContract",
            "0xtest",
            fakeArtifact
          );
          const sameContract2 = m.contractAt(
            "SameContract",
            "0xtest",
            fakeArtifact
          );

          return { sameContract1, sameContract2 };
        });
      }, /Contracts must have unique ids, Module1:SameContract has already been used/);
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.contractAt(
            "SameContract",
            "0xtest",
            fakeArtifact,
            {
              id: "same",
            }
          );
          const sameContract2 = m.contractAt(
            "SameContract",
            "0xtest",
            fakeArtifact,
            {
              id: "same",
            }
          );

          return { sameContract1, sameContract2 };
        });
      }, /Contracts must have unique ids, Module1:same has already been used/);
    });
  });
});
