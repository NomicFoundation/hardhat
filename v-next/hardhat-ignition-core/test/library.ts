/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/build-module.js";
import {
  AccountRuntimeValueImplementation,
  NamedLibraryDeploymentFutureImplementation,
} from "../src/internal/module.js";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module.js";
import { validateNamedLibraryDeployment } from "../src/internal/validation/futures/validateNamedLibraryDeployment.js";
import { FutureType } from "../src/types/module.js";

import {
  assertInstanceOf,
  assertValidationError,
  setupMockArtifactResolver,
} from "./helpers.js";

describe("library", () => {
  it("should be able to setup a deploy library call", () => {
    const moduleWithASingleContract = buildModule("Module1", (m) => {
      const library1 = m.library("Library1");

      return { library1 };
    });

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and library name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.library1.id,
      "Module1#Library1",
    );

    // 1 contract future
    assert.equal(moduleWithASingleContract.futures.size, 1);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one library as an after dependency of another", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.library("Another", { after: [example, otherModule] });

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
      !(anotherFuture instanceof NamedLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named library deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 2);
    assert(anotherFuture.dependencies.has(exampleFuture!));
    assert(anotherFuture.dependencies.has(otherModule!));
  });

  it("should be able to pass a library as a dependency of a library", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.library("Another", {
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
      !(anotherFuture instanceof NamedLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named library deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert.equal(anotherFuture.libraries.Example.id, exampleFuture?.id);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.library("Another", {
        from: "0x2",
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof NamedLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named library deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.library("Another", {
        from: m.getAccount(1),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof NamedLibraryDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named library deployment");
    }

    assertInstanceOf(anotherFuture.from, AccountRuntimeValueImplementation);
    assert.equal(anotherFuture.from.accountIndex, 1);
  });

  describe("passing id", () => {
    it("should be able to deploy the same library twice by passing an id", () => {
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.library("SameContract", { id: "first" });
        const sameContract2 = m.library("SameContract", {
          id: "second",
        });

        return { sameContract1, sameContract2 };
      });

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
            const sameContract1 = m.library("SameContract");
            const sameContract2 = m.library("SameContract");

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
            const sameContract1 = m.library("SameContract", {
              id: "same",
            });
            const sameContract2 = m.library("SameContract", {
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
              const another = m.contract("Another", [], { from: 1 as any });

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

              const test = m.library("Test", {
                libraries: { Call: call as any },
              });

              return { another, test };
            }),
          /IGN702: Module validation failed with reason: The value you provided for the library 'Call' is not a valid Future or it doesn't represent a contract/,
        );
      });
    });

    it("should not validate an invalid artifact", async () => {
      const module = buildModule("Module1", (m) => {
        const another = m.library("Another");

        return { another };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedLibraryDeployment(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          [],
        ),
        "Artifact for contract 'Another' is invalid",
      );
    });

    it("should not validate a negative account index", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(-1);
        const test = m.library("Test", { from: account });

        return { test };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedLibraryDeployment(
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
        const test = m.library("Test", { from: account });

        return { test };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedLibraryDeployment(
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
