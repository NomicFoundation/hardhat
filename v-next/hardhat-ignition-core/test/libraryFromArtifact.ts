/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/build-module.js";
import {
  AccountRuntimeValueImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
} from "../src/internal/module.js";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module.js";
import { validateArtifactLibraryDeployment } from "../src/internal/validation/futures/validateArtifactLibraryDeployment.js";

import {
  assertInstanceOf,
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers.js";

describe("libraryFromArtifact", () => {
  it("should be able to deploy with a library based on an artifact", () => {
    const moduleWithContractFromArtifact = buildModule("Module1", (m) => {
      const library1 = m.library("Library1", fakeArtifact);

      return { library1 };
    });

    assert.isDefined(moduleWithContractFromArtifact);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithContractFromArtifact.id, "Module1");
    assert.equal(
      moduleWithContractFromArtifact.results.library1.id,
      "Module1#Library1",
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an after dependency", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.library("Another", fakeArtifact, {
        after: [example, otherModule],
      });

      return { example, another };
    });

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 2);
    assert(anotherFuture.dependencies.has(exampleFuture!));
    assert(anotherFuture.dependencies.has(otherModule!));
  });

  it("should be able to pass a library as a dependency of a library", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.library("Another", fakeArtifact, {
        libraries: { Example: example },
      });

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example",
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
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
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.library("Another", fakeArtifact, {
        from: "0x2",
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof ArtifactLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact library deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.library("Another", fakeArtifact, {
        from: m.getAccount(1),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
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
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.library("SameContract", fakeArtifact, {
          id: "first",
        });
        const sameContract2 = m.library("SameContract", fakeArtifact, {
          id: "second",
        });

        return { sameContract1, sameContract2 };
      });

      // Sets ids based on module id and contract name
      assert.equal(moduleWithSameContractTwice.id, "Module1");
      assert.equal(
        moduleWithSameContractTwice.results.sameContract1.id,
        "Module1#first",
      );
      assert.equal(
        moduleWithSameContractTwice.results.sameContract2.id,
        "Module1#second",
      );
    });

    it("should throw if the same library is deployed twice without differentiating ids", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.library("SameContract", fakeArtifact);
            const sameContract2 = m.library("SameContract", fakeArtifact);

            return { sameContract1, sameContract2 };
          }),
        `The autogenerated future id ("Module1#SameContract") is already used. Please provide a unique id, as shown below:

m.library(..., { id: "MyUniqueId"})`,
      );
    });

    it("should throw if a library tries to pass the same id twice", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.library("SameContract", fakeArtifact, {
              id: "same",
            });
            const sameContract2 = m.library("SameContract", fakeArtifact, {
              id: "same",
            });

            return { sameContract1, sameContract2 };
          }),
        'The future id "same" is already used, please provide a different one.',
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate a non-address from option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.library("Another", fakeArtifact, {
                from: 1 as any,
              });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid type for option "from": number/,
        );
      });

      it("should not validate a non-contract library", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              const call = m.call(another, "test");

              const test = m.library("Test", fakeArtifact, {
                libraries: { Call: call as any },
              });

              return { another, test };
            }),
          /IGN702: Module validation failed with reason: The value you provided for the library 'Call' is not a valid Future or it doesn't represent a contract/,
        );
      });
    });

    it("should not validate a negative account index", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(-1);
        const test = m.library("Test", fakeArtifact, {
          from: account,
        });

        return { test };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateArtifactLibraryDeployment(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          [],
        ),
        "Account index cannot be a negative number",
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(1);
        const test = m.library("Test", fakeArtifact, {
          from: account,
        });

        return { test };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateArtifactLibraryDeployment(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          [],
        ),
        "Requested account index '1' is greater than the total number of available accounts '0'",
      );
    });
  });
});
