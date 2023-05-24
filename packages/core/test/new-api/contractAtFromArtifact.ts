import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

describe("contractAtFromArtifactFromArtifact", () => {
  const fakeArtifact: any = {};

  it("should be able to setup a contract at a given address", () => {
    const moduleWithContractFromArtifactDefinition = defineModule(
      "Module1",
      (m) => {
        const contract1 = m.contractAtFromArtifact(
          "Contract1",
          "0xtest",
          fakeArtifact
        );

        return { contract1 };
      }
    );

    const constructor = new ModuleConstructor([]);
    const moduleWithContractFromArtifact = constructor.construct(
      moduleWithContractFromArtifactDefinition
    );

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
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contractAtFromArtifact(
          "Another",
          "0xtest",
          fakeArtifact,
          {
            after: [example],
          }
        );

        return { example, another };
      }
    );

    const constructor = new ModuleConstructor([]);
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass a static call future as the address", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const call = m.staticCall(example, "getAddress");

        const another = m.contractAtFromArtifact("Another", call, fakeArtifact);

        return { example, another };
      }
    );

    const constructor = new ModuleConstructor([]);
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.equal(moduleWithDependentContracts.futures.size, 3);

    const anotherFuture = moduleWithDependentContracts.results.another;

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example#getAddress"
    );

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(callFuture!));
  });

  describe("passing id", () => {
    it("should be able to deploy the same contract twice by passing an id", () => {
      const moduleWithSameContractTwiceDefinition = defineModule(
        "Module1",
        (m) => {
          const sameContract1 = m.contractAtFromArtifact(
            "SameContract",
            "0x123",
            fakeArtifact,
            { id: "first" }
          );
          const sameContract2 = m.contractAtFromArtifact(
            "SameContract",
            "0x123",
            fakeArtifact,
            {
              id: "second",
            }
          );

          return { sameContract1, sameContract2 };
        }
      );

      const constructor = new ModuleConstructor([]);
      const moduleWithSameContractTwice = constructor.construct(
        moduleWithSameContractTwiceDefinition
      );

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
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contractAtFromArtifact(
          "SameContract",
          "0x123",
          fakeArtifact
        );
        const sameContract2 = m.contractAtFromArtifact(
          "SameContract",
          "0x123",
          fakeArtifact
        );

        return { sameContract1, sameContract2 };
      });

      const constructor = new ModuleConstructor([]);

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:SameContract found in module Module1/
      );
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contractAtFromArtifact(
          "SameContract",
          "0x123",
          fakeArtifact,
          {
            id: "same",
          }
        );
        const sameContract2 = m.contractAtFromArtifact(
          "SameContract",
          "0x123",
          fakeArtifact,
          {
            id: "same",
          }
        );

        return { sameContract1, sameContract2 };
      });

      const constructor = new ModuleConstructor([]);

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:same found in module Module1/
      );
    });
  });
});
