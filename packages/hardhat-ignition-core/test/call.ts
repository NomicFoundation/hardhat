/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact } from "../src";
import { buildModule } from "../src/build-module";
import {
  AccountRuntimeValueImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractCallFutureImplementation,
} from "../src/internal/module";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module";
import { validateNamedContractCall } from "../src/internal/validation/futures/validateNamedContractCall";
import { FutureType } from "../src/types/module";

import {
  assertInstanceOf,
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers";

describe("call", () => {
  it("should be able to setup a contract call", () => {
    const moduleWithASingleContract = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "test");

      return { contract1 };
    });

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.contract1.id,
      "Module1#Contract1"
    );

    // 1 contract future & 1 call future
    assert.equal(moduleWithASingleContract.futures.size, 2);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT
    );
    assert.equal(
      [...moduleWithASingleContract.futures][1].type,
      FutureType.CONTRACT_CALL
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one contract as an arg dependency to a call", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another");

      m.call(example, "test", [another]);

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract call future");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass one contract as an after dependency of a call", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another");

      m.call(example, "test", [], { after: [another, otherModule] });

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.dependencies.size, 3);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
    assert(callFuture.dependencies.has(otherModule!));
  });

  it("should be able to pass value as an option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");

      m.call(example, "test", [], { value: BigInt(42) });

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.value, BigInt(42));
  });

  it("Should be able to pass an ModuleParameterRuntimeValue as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");

      m.call(example, "test", [], { value: m.getParameter("value") });

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(
      callFuture.value,
      ModuleParameterRuntimeValueImplementation
    );
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");

      m.call(example, "test", [], { from: "0x2" });

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");

      m.call(example, "test", [], { from: m.getAccount(1) });

      return { example };
    });

    assert.isDefined(moduleWithDependentContracts);

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(callFuture.from, AccountRuntimeValueImplementation);
    assert.equal(callFuture.from.accountIndex, 1);
  });

  describe("Arguments", () => {
    it("Should support base values as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [1, true, "string", 4n]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [1, true, "string", 4n]);
    });

    it("Should support arrays as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [[1, 2, 3n]]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [[1, 2, 3n]]);
    });

    it("Should support objects as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ a: 1, b: [1, 2] }]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.deepEqual(future.args, [{ a: 1, b: [1, 2] }]);
    });

    it("Should support futures as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [contract1]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.equal(future.args[0], module.results.contract1);
    });

    it("should support nested futures as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ arr: [contract1] }]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assert.equal((future.args[0] as any).arr[0], module.results.contract1);
    });

    it("should support AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [account1]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assertInstanceOf(future.args[0], AccountRuntimeValueImplementation);
      assert.equal(future.args[0].accountIndex, 1);
    });

    it("should support nested AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ arr: [account1] }]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      const account = (future.args[0] as any).arr[0];

      assertInstanceOf(account, AccountRuntimeValueImplementation);

      assert.equal(account.accountIndex, 1);
    });

    it("should support ModuleParameterRuntimeValue as arguments", () => {
      const module = buildModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [p]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      assertInstanceOf(
        future.args[0],
        ModuleParameterRuntimeValueImplementation
      );
      assert.equal(future.args[0].name, "p");
      assert.equal(future.args[0].defaultValue, 123);
    });

    it("should support nested ModuleParameterRuntimeValue as arguments", () => {
      const module = buildModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Contract1");
        m.call(contract1, "foo", [{ arr: [p] }]);

        return { contract1 };
      });

      const future = [...module.futures].find(
        ({ type }) => type === FutureType.CONTRACT_CALL
      );

      assertInstanceOf(future, NamedContractCallFutureImplementation);
      const param = (future.args[0] as any).arr[0];

      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.equal(param.defaultValue, 123);
    });
  });

  describe("passing id", () => {
    it("should be able to call the same function twice by passing an id", () => {
      const moduleWithSameCallTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("Example");

        m.call(sameContract1, "test", [], { id: "first" });
        m.call(sameContract1, "test", [], { id: "second" });

        return { sameContract1 };
      });

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const callFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1#first"
      );

      const callFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1#second"
      );

      assert.isDefined(callFuture);
      assert.isDefined(callFuture2);
    });

    it("should throw if the same function is called twice without differentiating ids", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract");
            m.call(sameContract1, "test");
            m.call(sameContract1, "test");

            return { sameContract1 };
          }),
        `The autogenerated future id ("Module1#SameContract.test") is already used. Please provide a unique id, as shown below:

m.call(..., { id: "MyUniqueId"})`
      );
    });

    it("should throw if a call tries to pass the same id twice", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract");
            m.call(sameContract1, "test", [], { id: "first" });
            m.call(sameContract1, "test", [], { id: "first" });
            return { sameContract1 };
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
              m.call(another, "test", [], { value: 42 as any });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid option "value" received. It should be a bigint, a module parameter, or a value obtained from an event or static call./
        );
      });

      it("should not validate a non-address from option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              m.call(another, "test", [], { from: 1 as any });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid type for option "from": number/
        );
      });

      it("should not validate a non-contract", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              const call = m.call(another, "test");

              m.call(call as any, "test");

              return { another };
            }),
          /Invalid contract given/
        );
      });

      it("should not validate a library", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.library("Another");

              m.call(another as any, "test");

              return { another };
            }),
          /Invalid contract given/
        );
      });
    });

    it("should not validate a non-existent hardhat contract", async () => {
      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", []);
        m.call(another, "test");

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          []
        ),
        "Artifact for contract 'Another' is invalid"
      );
    });

    it("should not validate a non-existent function", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        contractName: "Another",
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test");

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Function 'test' not found in contract Another"
      );
    });

    it("should not validate a call with wrong number of arguments", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "inc",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "inc", [1, 2]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Function inc in contract Another expects 1 arguments but 2 were given"
      );
    });

    it("should not validate an overloaded call with wrong number of arguments", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "inc",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
              {
                internalType: "uint256",
                name: "n",
                type: "uint256",
              },
            ],
            name: "inc",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        contractName: "Another",
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "inc(bool,uint256)", [1, 2, 3]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Function inc(bool,uint256) in contract Another expects 2 arguments but 3 were given"
      );
    });

    it("should not validate a missing module parameter", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");

        const another = m.contract("Another", fakeArtifact, []);
        m.call(another, "test", [p]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        ),
        "Module parameter 'p' requires a value but was given none"
      );
    });

    it("should not validate a module parameter of the wrong type for value", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", false as unknown as bigint);

        const another = m.contract("Another", fakeArtifact, []);
        m.call(another, "test", [], { value: p });

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        ),
        "Module parameter 'p' must be of type 'bigint' but is 'boolean'"
      );
    });

    it("should validate a module parameter of the correct type for value", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [],
            name: "test",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 42n);

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [], { value: p });

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      await assert.isFulfilled(
        validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        )
      );
    });

    it("should validate a missing module parameter if a default parameter is present", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", true);

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [p]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      const result = await validateNamedContractCall(
        future as any,
        setupMockArtifactResolver({ Another: fakeArtifact }),
        {},
        []
      );

      assert.deepEqual(result, []);
    });

    it("should validate a missing module parameter if a global parameter is present", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [p]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      const result = await validateNamedContractCall(
        future as any,
        setupMockArtifactResolver({ Another: fakeArtifact }),
        {
          $global: {
            p: true,
          },
        },
        []
      );

      assert.deepEqual(result, []);
    });

    it("should not validate a missing module parameter (deeply nested)", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");

        const another = m.contract("Another", fakeArtifact, []);
        m.call(another, "test", [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        ),
        "Module parameter 'p' requires a value but was given none"
      );
    });

    it("should validate a missing module parameter if a default parameter is present (deeply nested)", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", true);

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      await assert.isFulfilled(
        validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        )
      );
    });

    it("should validate a module parameter with a default value that is an AccountRuntimeValue", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "address",
                name: "b",
                type: "address",
              },
            ],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", m.getAccount(1));

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [p]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      await assert.isFulfilled(
        validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Another: fakeArtifact }),
          {},
          []
        )
      );
    });

    it("should not validate a module parameter with a default value that is an AccountRuntimeValue for a negative index", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "address",
                name: "b",
                type: "address",
              },
            ],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", m.getAccount(-1));

        const another = m.contract("Another", fakerArtifact, []);
        m.call(another, "test", [p]);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          []
        ),
        "Account index cannot be a negative number"
      );
    });

    it("should not validate a negative account index", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "inc",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        const account = m.getAccount(-1);
        m.call(another, "inc", [1], { from: account });

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
          future as any,
          setupMockArtifactResolver(),
          {},
          []
        ),
        "Account index cannot be a negative number"
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "bool",
                name: "b",
                type: "bool",
              },
            ],
            name: "inc",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        const account = m.getAccount(1);
        m.call(another, "inc", [1], { from: account });

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_CALL
      );

      assertValidationError(
        await validateNamedContractCall(
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
