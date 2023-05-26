import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import {
  AccountRuntimeValueImplementation,
  NamedContractCallFutureImplementation,
} from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { FutureType } from "../../src/new-api/types/module";

import { assertInstanceOf } from "./helpers";

describe("call", () => {
  it("should be able to setup a contract call", () => {
    const moduleWithASingleContractDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "test");

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
      FutureType.NAMED_CONTRACT_CALL
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one contract as an arg dependency to a call", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another");

        m.call(example, "test", [another]);

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
      ({ id }) => id === "Module1:Example#test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract call future");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass one contract as an after dependency of a call", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contract("Another");

        m.call(example, "test", [], { after: [another] });

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
      ({ id }) => id === "Module1:Example#test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass value as an option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");

        m.call(example, "test", [], { value: BigInt(42) });

        return { example };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example#test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.value, BigInt(42));
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");

        m.call(example, "test", [], { from: "0x2" });

        return { example };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example#test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");

        m.call(example, "test", [], { from: m.getAccount(1) });

        return { example };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example#test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(callFuture.from, AccountRuntimeValueImplementation);
    assert.equal(callFuture.from.accountIndex, 1);
  });

  describe("Arguments", () => {
    it("Should support base values as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [1, true, "string", 4n]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [1, true, "string", 4n]);
    });

    it("Should support arrays as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [[1, 2, 3n]]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [[1, 2, 3n]]);
    });

    it("Should support objects as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ a: 1, b: [1, 2] }]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [{ a: 1, b: [1, 2] }]);
    });

    it("Should support futures as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [contract1]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.equal(future.args[0], module.results.contract1);
    });

    it("should support nested futures as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ arr: [contract1] }]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.equal((future.args[0] as any).arr[0], module.results.contract1);
    });

    it("should support AccountRuntimeValues as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [account1]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assertInstanceOf(future.args[0], AccountRuntimeValueImplementation);
      assert.equal(future.args[0].accountIndex, 1);
    });

    it("should support nested AccountRuntimeValues as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ arr: [account1] }]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.NAMED_CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      const account = (future.args[0] as any).arr[0];

      assertInstanceOf(account, AccountRuntimeValueImplementation);

      assert.equal(account.accountIndex, 1);
    });
  });

  describe("passing id", () => {
    it("should be able to call the same function twice by passing an id", () => {
      const moduleWithSameCallTwiceDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contract("Example");

        m.call(sameContract1, "test", [], { id: "first" });
        m.call(sameContract1, "test", [], { id: "second" });

        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();
      const moduleWithSameCallTwice = constructor.construct(
        moduleWithSameCallTwiceDefinition
      );

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const callFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example#first"
      );

      const callFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example#second"
      );

      assert.isDefined(callFuture);
      assert.isDefined(callFuture2);
    });

    it("should throw if the same function is called twice without differentiating ids", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract");
        m.call(sameContract1, "test");
        m.call(sameContract1, "test");

        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:SameContract#test found in module Module1/
      );
    });

    it("should throw if a call tries to pass the same id twice", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract");
        m.call(sameContract1, "test", [], { id: "first" });
        m.call(sameContract1, "test", [], { id: "first" });
        return { sameContract1 };
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:SameContract#first found in module Module1/
      );
    });
  });
});
