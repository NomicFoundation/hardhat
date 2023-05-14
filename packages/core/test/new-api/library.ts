import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { NamedLibraryDeploymentFutureImplementation } from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { FutureType } from "../../src/new-api/types/module";

describe("library", () => {
  it("should be able to setup a deploy library call", () => {
    const moduleWithASingleContractDefinition = buildModule("Module1", (m) => {
      const library1 = m.library("Library1");

      return { library1 };
    });

    const constructor = new ModuleConstructor();
    const moduleWithASingleContract = constructor.construct(
      moduleWithASingleContractDefinition
    );

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and library name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.library1.id,
      "Module1:Library1"
    );

    // 1 contract future
    assert.equal(moduleWithASingleContract.futures.size, 1);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_LIBRARY_DEPLOYMENT
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one library as an after dependency of another", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.library("Example");
        const another = m.library("Another", { after: [example] });

        return { example, another };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Another"
    );

    if (
      !(anotherFuture instanceof NamedLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named library deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  describe("passing id", () => {
    it("should be able to deploy the same library twice by passing an id", () => {
      const moduleWithSameContractTwiceDefinition = buildModule(
        "Module1",
        (m) => {
          const sameContract1 = m.library("SameContract", { id: "first" });
          const sameContract2 = m.library("SameContract", {
            id: "second",
          });

          return { sameContract1, sameContract2 };
        }
      );

      const constructor = new ModuleConstructor();
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

    it("should throw if the same library is deployed twice without differentiating ids", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.library("SameContract");
          const sameContract2 = m.library("SameContract");

          return { sameContract1, sameContract2 };
        });
      }, /Libraries must have unique ids, Module1:SameContract has already been used/);
    });

    it("should throw if a library tries to pass the same id twice", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.library("SameContract", {
            id: "same",
          });
          const sameContract2 = m.library("SameContract", {
            id: "same",
          });

          return { sameContract1, sameContract2 };
        });
      }, /Libraries must have unique ids, Module1:same has already been used/);
    });
  });
});
