/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact } from "../../src";
import { buildModule } from "../../src/new-api/build-module";
import {
  AccountRuntimeValueImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
} from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { getFuturesFromModule } from "../../src/new-api/internal/utils/get-futures-from-module";
import { validateArtifactLibraryDeployment } from "../../src/new-api/internal/validation/futures/validateArtifactLibraryDeployment";

import { assertInstanceOf, setupMockArtifactResolver } from "./helpers";

describe("libraryFromArtifact", () => {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  it("should be able to deploy with a library based on an artifact", () => {
    const moduleWithContractFromArtifactDefinition = buildModule(
      "Module1",
      (m) => {
        const library1 = m.libraryFromArtifact("Library1", fakeArtifact);

        return { library1 };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithContractFromArtifact = constructor.construct(
      moduleWithContractFromArtifactDefinition
    );

    assert.isDefined(moduleWithContractFromArtifact);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithContractFromArtifact.id, "Module1");
    assert.equal(
      moduleWithContractFromArtifact.results.library1.id,
      "Module1:Library1"
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an after dependency", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.library("Example");
        const another = m.libraryFromArtifact("Another", fakeArtifact, {
          after: [example],
        });

        return { example, another };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass a library as a dependency of a library", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.library("Example");
        const another = m.libraryFromArtifact("Another", fakeArtifact, {
          libraries: { Example: example },
        });

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
      !(anotherFuture instanceof ArtifactLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact library deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert.equal(anotherFuture.libraries.Example.id, exampleFuture?.id);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const another = m.libraryFromArtifact("Another", fakeArtifact, {
          from: "0x2",
        });

        return { another };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Another"
    );

    if (
      !(anotherFuture instanceof ArtifactLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact library deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const another = m.libraryFromArtifact("Another", fakeArtifact, {
          from: m.getAccount(1),
        });

        return { another };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Another"
    );

    if (
      !(anotherFuture instanceof ArtifactLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact library deployment");
    }

    assertInstanceOf(anotherFuture.from, AccountRuntimeValueImplementation);
    assert.equal(anotherFuture.from.accountIndex, 1);
  });

  describe("passing id", () => {
    it("should use library from artifact twice by passing an id", () => {
      const moduleWithSameContractTwiceDefinition = buildModule(
        "Module1",
        (m) => {
          const sameContract1 = m.libraryFromArtifact(
            "SameContract",
            fakeArtifact,
            { id: "first" }
          );
          const sameContract2 = m.libraryFromArtifact(
            "SameContract",
            fakeArtifact,
            {
              id: "second",
            }
          );

          return { sameContract1, sameContract2 };
        }
      );

      const constructor = new ModuleConstructor();
      const moduleWithSameContractTwice = constructor.construct(
        moduleWithSameContractTwiceDefinition
      );

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

    it("should throw if the same library is deployed twice without differentiating ids", () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.libraryFromArtifact(
          "SameContract",
          fakeArtifact
        );
        const sameContract2 = m.libraryFromArtifact(
          "SameContract",
          fakeArtifact
        );

        return { sameContract1, sameContract2 };
      });
      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:SameContract found in module Module1/
      );
    });

    it("should throw if a library tries to pass the same id twice", () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.libraryFromArtifact(
          "SameContract",
          fakeArtifact,
          {
            id: "same",
          }
        );
        const sameContract2 = m.libraryFromArtifact(
          "SameContract",
          fakeArtifact,
          {
            id: "same",
          }
        );

        return { sameContract1, sameContract2 };
      });
      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:same found in module Module1/
      );
    });
  });

  describe("validation", () => {
    it("should not validate a non-address from option", () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const another = m.libraryFromArtifact("Another", fakeArtifact, {
            from: 1 as any,
          });

          return { another };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Invalid type for given option "from": number/
      );
    });

    it("should not validate a non-contract library", () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const another = m.contract("Another", []);
          const call = m.call(another, "test");

          const test = m.libraryFromArtifact("Test", fakeArtifact, {
            libraries: { Call: call as any },
          });

          return { another, test };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Given library 'Call' is not a valid Future/
      );
    });

    it("should not validate an invalid artifact", () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const another = m.libraryFromArtifact("Another", {} as Artifact);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Invalid artifact given/
      );
    });

    it("should not validate a negative account index", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const account = m.getAccount(-1);
          const test = m.libraryFromArtifact("Test", fakeArtifact, {
            from: account,
          });

          return { test };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const [future] = getFuturesFromModule(module);

      await assert.isRejected(
        validateArtifactLibraryDeployment(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          []
        ),
        /Account index cannot be a negative number/
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const account = m.getAccount(1);
          const test = m.libraryFromArtifact("Test", fakeArtifact, {
            from: account,
          });

          return { test };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const [future] = getFuturesFromModule(module);

      await assert.isRejected(
        validateArtifactLibraryDeployment(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          []
        ),
        /Requested account index \'1\' is greater than the total number of available accounts \'0\'/
      );
    });
  });
});
