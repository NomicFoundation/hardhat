/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/build-module";
import {
  AccountRuntimeValueImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedEncodeFunctionCallFutureImplementation,
  SendDataFutureImplementation,
} from "../src/internal/module";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module";
import { validateSendData } from "../src/internal/validation/futures/validateSendData";
import { FutureType } from "../src/types/module";

import {
  assertInstanceOf,
  assertValidationError,
  setupMockArtifactResolver,
} from "./helpers";

describe("send", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  it("should be able to setup a send", () => {
    const moduleWithASingleContract = buildModule("Module1", (m) => {
      m.send("test_send", exampleAddress, 0n, "test-data");

      return {};
    });

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
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.data, "test-data");
  });

  it("should be able to pass one contract as the 'to' arg for a send", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      m.send("test_send", example, 0n, "");

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.dependencies.size, 1);
    assert(sendFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass one contract as an after dependency of a send", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      m.send("test_send", exampleAddress, 0n, "", {
        after: [example, otherModule],
      });

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.dependencies.size, 2);
    assert(sendFuture.dependencies.has(exampleFuture!));
    assert(sendFuture.dependencies.has(otherModule!));
  });

  it("should be able to pass a value", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      m.send("test_send", exampleAddress, 42n, "");

      return {};
    });

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.value, BigInt(42));
  });

  it("Should be able to pass a ModuleParameterRuntimeValue as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      m.send("test_send", exampleAddress, m.getParameter("value"), "");

      return {};
    });

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assertInstanceOf(
      sendFuture.value,
      ModuleParameterRuntimeValueImplementation
    );
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      m.send("test_send", exampleAddress, 0n, "", { from: differentAddress });

      return {};
    });

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assert.equal(sendFuture.from, differentAddress);
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      m.send("test_send", exampleAddress, 0n, "", { from: m.getAccount(1) });

      return {};
    });

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assertInstanceOf(sendFuture.from, AccountRuntimeValueImplementation);
    assert.equal(sendFuture.from.accountIndex, 1);
  });

  it("Should be able to pass an AccountRuntimeValue as address", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      m.send("test_send", m.getAccount(1), 0n, "");

      return {};
    });

    assert.isDefined(moduleWithDependentContracts);

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    assertInstanceOf(sendFuture.to, AccountRuntimeValueImplementation);
    assert.equal(sendFuture.to.accountIndex, 1);
  });

  it("Should be able to pass a module param as address", () => {
    const module = buildModule("Module", (m) => {
      const paramWithDefault = m.getParameter("addressWithDefault", "0x000000");
      const paramWithoutDefault = m.getParameter("addressWithoutDefault");

      m.send("C", paramWithDefault);
      m.send("C2", paramWithoutDefault);

      return {};
    });

    const futureC = Array.from(module.futures).find((f) => f.id === "Module#C");
    assertInstanceOf(futureC, SendDataFutureImplementation);

    const futureC2 = Array.from(module.futures).find(
      (f) => f.id === "Module#C2"
    );
    assertInstanceOf(futureC2, SendDataFutureImplementation);

    assertInstanceOf(futureC.to, ModuleParameterRuntimeValueImplementation);
    assert.equal(futureC.to.name, "addressWithDefault");
    assert.equal(futureC.to.defaultValue, "0x000000");

    assertInstanceOf(futureC2.to, ModuleParameterRuntimeValueImplementation);
    assert.equal(futureC2.to.name, "addressWithoutDefault");
    assert.equal(futureC2.to.defaultValue, undefined);
  });

  it("should be able to pass an encode function call future as the 'data' arg for a send", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const data = m.encodeFunctionCall(example, "test", []);
      m.send("test_send", example, 0n, data);

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#encodeFunctionCall(Module1#Example.test)"
    );

    const sendFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#test_send"
    );

    if (!(sendFuture instanceof SendDataFutureImplementation)) {
      assert.fail("Not a send data future");
    }

    if (
      !(exampleFuture instanceof NamedEncodeFunctionCallFutureImplementation)
    ) {
      assert.fail("Not an encode function call future");
    }

    assert.equal(sendFuture.dependencies.size, 2);
    assert(sendFuture.dependencies.has(exampleFuture!));
  });

  describe("passing id", () => {
    it("should be able to call the same function twice by passing an id", () => {
      const moduleWithSameCallTwice = buildModule("Module1", (m) => {
        m.send("first", exampleAddress, 0n, "test");
        m.send("second", exampleAddress, 0n, "test");

        return {};
      });

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const sendFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1#first"
      );

      const sendFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1#second"
      );

      assert.isDefined(sendFuture);
      assert.isDefined(sendFuture2);
    });

    it("should throw if the same function is called twice without differentiating ids", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            m.send("test_send", exampleAddress, 0n, "test");
            m.send("test_send", exampleAddress, 0n, "test");

            return {};
          }),
        'The future id "test_send" is already used, please provide a different one.'
      );
    });

    it("should throw if a call tries to pass the same id twice", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            m.send("first", exampleAddress, 0n, "test");
            m.send("first", exampleAddress, 0n, "test");
            return {};
          }),
        'The future id "first" is already used, please provide a different one.'
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate a non-bignumber value option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              m.send("id", exampleAddress, 42 as any);

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid option "value" received. It should be a bigint, a module parameter, or a value obtained from an event or static call./
        );
      });

      it("should not validate a non-string data option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              m.send("id", exampleAddress, 0n, 42 as any);

              return { another };
            }),
          /Invalid data given/
        );
      });

      it("should not validate a non-address from option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              m.send("id", another, 0n, "", { from: 1 as any });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid type for option "from": number/
        );
      });

      it("should not validate an invalid address", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              const call = m.call(another, "test");

              m.send("id", call as any, 0n, "");

              return { another };
            }),
          /Invalid address given/
        );
      });

      it("should not validate a `to` as a string that is not an address", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              m.send("id", "0xnot-an-address", 0n, "");

              return {};
            }),
          /Invalid address given/
        );
      });

      it("should not allow the from and to address to be the same", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              m.send("id", m.getAccount(1), 0n, "", { from: m.getAccount(1) });

              return {};
            }),
          /The "to" and "from" addresses are the same/
        );
      });
    });

    it("should not validate a missing module parameter", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        m.send("id", p, 0n, "");

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      assertValidationError(
        await validateSendData(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Module parameter 'p' requires a value but was given none"
      );
    });

    it("should validate a missing module parameter if a default parameter is present", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", "0x123");
        m.send("id", p, 0n, "");

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      const result = await validateSendData(
        future as any,
        setupMockArtifactResolver(),
        {},
        []
      );

      assert.deepStrictEqual(result, []);
    });

    it("should validate a missing module parameter if a global parameter is present", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        m.send("id", p, 0n, "");

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      const result = await validateSendData(
        future as any,
        setupMockArtifactResolver(),
        {
          $global: {
            p: "0x123",
          },
        },
        []
      );

      assert.deepStrictEqual(result, []);
    });

    it("should not validate a module parameter of the wrong type for value", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", false as unknown as bigint);
        m.send("id", exampleAddress, p, "");

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      assertValidationError(
        await validateSendData(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Module parameter 'p' must be of type 'bigint' but is 'boolean'"
      );
    });

    it("should validate a module parameter of the correct type for value", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 42n);
        m.send("id", exampleAddress, p, "");

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      const result = await validateSendData(
        future as any,
        setupMockArtifactResolver(),
        {},
        []
      );

      assert.deepStrictEqual(result, []);
    });

    it("should not validate a negative account index", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(-1);
        m.send("id", exampleAddress, 0n, "", { from: account });

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      assertValidationError(
        await validateSendData(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Account index cannot be a negative number"
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(1);
        m.send("id", exampleAddress, 0n, "", { from: account });

        return {};
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.SEND_DATA
      );

      assertValidationError(
        await validateSendData(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Requested account index '1' is greater than the total number of available accounts '0'"
      );
    });
  });
});
