import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import {
  NamedContractCallFutureImplementation,
  NamedStaticCallFutureImplementation,
} from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { FutureType } from "../../src/new-api/types/module";

describe("static call", () => {
  it("should be able to setup a static call", () => {
    const moduleWithASingleContractDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "test");

      return { contract1 };
    });

    const constructor = new ModuleConstructor();
    const moduleWithASingleContract = constructor.construct(
      moduleWithASingleContractDefinition
    );

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.contract1.id,
      "Module1:Contract1"
    );

    // 1 contract future & 1 call future
    assert.equal(moduleWithASingleContract.futures.size, 2);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_CONTRACT_DEPLOYMENT
    );
    assert.equal(
      [...moduleWithASingleContract.futures][1].type,
      FutureType.NAMED_STATIC_CALL
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one contract as an arg dependency to a static call", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another");

        m.staticCall(example, "test", [another]);

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
      ({ id }) => id === "Module1:Example"
    );

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example:test"
    );

    if (!(callFuture instanceof NamedStaticCallFutureImplementation)) {
      assert.fail("Not a named contract call future");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass one contract as an after dependency of a static call", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another");

        m.staticCall(example, "test", [], { after: [another] });

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

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example:test"
    );

    if (!(callFuture instanceof NamedStaticCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass its result into another call", () => {
    const moduleWithASingleContractDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      const data = m.staticCall(contract1, "test");

      m.call(contract1, "test2", [data]);

      return { contract1 };
    });

    const constructor = new ModuleConstructor();
    const moduleWithASingleContract = constructor.construct(
      moduleWithASingleContractDefinition
    );

    assert.isDefined(moduleWithASingleContract);

    const staticCallFuture = [...moduleWithASingleContract.futures].find(
      ({ id }) => id === "Module1:Contract1:test"
    );

    const callFuture = [...moduleWithASingleContract.futures].find(
      ({ id }) => id === "Module1:Contract1:test2"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(staticCallFuture!));
  });

  describe("passing id", () => {
    it("should be able to statically call the same function twice by passing an id", () => {
      const moduleWithSameCallTwiceDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("Example");

        m.staticCall(sameContract1, "test", [], { id: "first" });
        m.staticCall(sameContract1, "test", [], { id: "second" });

        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();
      const moduleWithSameCallTwice = constructor.construct(
        moduleWithSameCallTwiceDefinition
      );

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const callFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example:first"
      );

      const callFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example:second"
      );

      assert.isDefined(callFuture);
      assert.isDefined(callFuture2);
    });

    it("should throw if the same function is statically called twice without differentiating ids", () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract");
        m.staticCall(sameContract1, "test");
        m.staticCall(sameContract1, "test");

        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Static calls must have unique ids, Module1:SameContract:test has already been used/
      );
    });

    it("should throw if a static call tries to pass the same id twice", () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract");
        m.staticCall(sameContract1, "test", [], { id: "first" });
        m.staticCall(sameContract1, "test", [], { id: "first" });
        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Static calls must have unique ids, Module1:SameContract:first has already been used/
      );
    });
  });
});
