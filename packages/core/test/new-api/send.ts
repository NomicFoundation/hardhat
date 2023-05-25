import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import { SendDataFutureImplementation } from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { FutureType, RuntimeValueType } from "../../src/new-api/types/module";

describe("send", () => {
  it("should be able to setup a send", () => {
    const moduleWithASingleContractDefinition = defineModule("Module1", (m) => {
      m.send("test send", "0xtest", 0n, "test-data");

      return {};
    });

    const constructor = new ModuleConstructor();
    const moduleWithASingleContract = constructor.construct(
      moduleWithASingleContractDefinition
    );

    assert.isDefined(moduleWithASingleContract);

    // 1 contract future & 1 call future
    assert.equal(moduleWithASingleContract.futures.size, 1);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.SEND_DATA
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);

    const sendFuture = [...moduleWithASingleContract.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.data, "test-data");
  });

  it("should be able to pass one contract as the 'to' arg for a send", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        m.send("test send", example, 0n, "");

        return { example };
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

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.dependencies.size, 1);
    assert(sendFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass one contract as an after dependency of a send", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        m.send("test send", "0xtest", 0n, "", { after: [example] });

        return { example };
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

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.dependencies.size, 1);
    assert(sendFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass a value", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        m.send("test send", "0xtest", 42n, "");

        return {};
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.value, BigInt(42));
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        m.send("test send", "0xtest", 0n, "", { from: "0x2" });

        return {};
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        m.send("test send", "0xtest", 0n, "", { from: m.getAccount(1) });

        return {};
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:test send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.from, {
      type: RuntimeValueType.ACCOUNT,
      accountIndex: 1,
    });
  });

  describe("passing id", () => {
    it("should be able to call the same function twice by passing an id", () => {
      const moduleWithSameCallTwiceDefinition = defineModule("Module1", (m) => {
        m.send("test send", "0xtest", 0n, "test", { id: "first" });
        m.send("test send", "0xtest", 0n, "test", { id: "second" });

        return {};
      });

      const constructor = new ModuleConstructor();
      const moduleWithSameCallTwice = constructor.construct(
        moduleWithSameCallTwiceDefinition
      );

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const sendFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:first"
      );

      const sendFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:second"
      );

      assert.isDefined(sendFuture);
      assert.isDefined(sendFuture2);
    });

    it("should throw if the same function is called twice without differentiating ids", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        m.send("test send", "0xtest", 0n, "test");
        m.send("test send", "0xtest", 0n, "test");

        return {};
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:test send found in module Module1/
      );
    });

    it("should throw if a call tries to pass the same id twice", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        m.send("test send", "0xtest", 0n, "test", { id: "first" });
        m.send("test send", "0xtest", 0n, "test", { id: "first" });
        return {};
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:first found in module Module1/
      );
    });
  });
});
