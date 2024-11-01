/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact } from "../src";
import { buildModule } from "../src/build-module";
import {
  AccountRuntimeValueImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
  ReadEventArgumentFutureImplementation,
} from "../src/internal/module";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module";
import { validateNamedContractDeployment } from "../src/internal/validation/futures/validateNamedContractDeployment";
import { FutureType } from "../src/types/module";

import {
  assertInstanceOf,
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers";

describe("contract", () => {
  it("should be able to setup a deploy contract call", () => {
    const moduleWithASingleContract = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.contract1.id,
      "Module1#Contract1"
    );

    // 1 contract future
    assert.equal(moduleWithASingleContract.futures.size, 1);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one contract as an arg dependency to another", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another", [example]);

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass one contract as an after dependency of another", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another", [], {
        after: [example, otherModule],
      });

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 2);
    assert(anotherFuture.dependencies.has(exampleFuture!));
    assert(anotherFuture.dependencies.has(otherModule!));
  });

  it("should be able to pass a library as a dependency of a contract", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.contract("Another", [], {
        libraries: { Example: example },
      });

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert.equal(anotherFuture.libraries.Example.id, exampleFuture?.id);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass value as an option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", [], { value: BigInt(42) });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(anotherFuture.value, BigInt(42));
  });

  it("Should be able to pass a ModuleParameterRuntimeValue as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", [], {
        value: m.getParameter("value"),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(
      anotherFuture.value,
      ModuleParameterRuntimeValueImplementation
    );
  });

  it("Should be able to pass a StaticCallFuture as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const contract = m.contract("Contract");
      const staticCall = m.staticCall(contract, "test");

      const another = m.contract("Another", [], {
        value: staticCall,
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(anotherFuture.value, NamedStaticCallFutureImplementation);
  });

  it("Should be able to pass a ReadEventArgumentFuture as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const contract = m.contract("Contract");
      const eventArg = m.readEventArgument(contract, "TestEvent", "eventArg");

      const another = m.contract("Another", [], {
        value: eventArg,
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(
      anotherFuture.value,
      ReadEventArgumentFutureImplementation
    );
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", [], { from: "0x2" });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", [], { from: m.getAccount(1) });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another"
    );

    if (
      !(anotherFuture instanceof NamedContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not a named contract deployment");
    }

    assertInstanceOf(anotherFuture.from, AccountRuntimeValueImplementation);
    assert.equal(anotherFuture.from.accountIndex, 1);
  });

  describe("Arguments", () => {
    it("Should support base values as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1", [1, true, "string", 4n]);

        return { contract1 };
      });

      assert.deepEqual(module.results.contract1.constructorArgs, [
        1,
        true,
        "string",
        4n,
      ]);
    });

    it("Should support arrays as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1", [[1, 2, 3n]]);

        return { contract1 };
      });

      assert.deepEqual(module.results.contract1.constructorArgs[0], [1, 2, 3n]);
    });

    it("Should support objects as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1", [{ a: 1, b: [1, 2] }]);

        return { contract1 };
      });

      assert.deepEqual(module.results.contract1.constructorArgs[0], {
        a: 1,
        b: [1, 2],
      });
    });

    it("Should support futures as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [contract1]);

        return { contract1, contract2 };
      });

      assert.equal(
        module.results.contract2.constructorArgs[0],
        module.results.contract1
      );
    });

    it("should support nested futures as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [{ arr: [contract1] }]);

        return { contract1, contract2 };
      });

      assert.equal(
        (module.results.contract2.constructorArgs[0] as any).arr[0],
        module.results.contract1
      );
    });

    it("should support AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1", [account1]);

        return { contract1 };
      });

      assertInstanceOf(
        module.results.contract1.constructorArgs[0],
        AccountRuntimeValueImplementation
      );
      assert.equal(module.results.contract1.constructorArgs[0].accountIndex, 1);
    });

    it("should support nested AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1", [{ arr: [account1] }]);

        return { contract1 };
      });

      const account = (module.results.contract1.constructorArgs[0] as any)
        .arr[0];

      assertInstanceOf(account, AccountRuntimeValueImplementation);

      assert.equal(account.accountIndex, 1);
    });

    it("should support ModuleParameterRuntimeValue as arguments", () => {
      const module = buildModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Contract1", [p]);

        return { contract1 };
      });

      assertInstanceOf(
        module.results.contract1.constructorArgs[0],
        ModuleParameterRuntimeValueImplementation
      );
      assert.equal(module.results.contract1.constructorArgs[0].name, "p");
      assert.equal(
        module.results.contract1.constructorArgs[0].defaultValue,
        123
      );
    });

    it("should support nested ModuleParameterRuntimeValue as arguments", () => {
      const module = buildModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Contract1", [{ arr: [p] }]);

        return { contract1 };
      });

      const param = (module.results.contract1.constructorArgs[0] as any).arr[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.equal(param.defaultValue, 123);
    });
  });

  describe("passing id", () => {
    it("should be able to deploy the same contract twice by passing an id", () => {
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract", [], { id: "first" });
        const sameContract2 = m.contract("SameContract", [], {
          id: "second",
        });

        return { sameContract1, sameContract2 };
      });

      assert.equal(moduleWithSameContractTwice.id, "Module1");
      assert.equal(
        moduleWithSameContractTwice.results.sameContract1.id,
        "Module1#first"
      );
      assert.equal(
        moduleWithSameContractTwice.results.sameContract2.id,
        "Module1#second"
      );
    });

    it("should throw if the same contract is deployed twice without differentiating ids", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract");
            const sameContract2 = m.contract("SameContract");

            return { sameContract1, sameContract2 };
          }),
        `The autogenerated future id ("Module1#SameContract") is already used. Please provide a unique id, as shown below:

m.contract(..., { id: "MyUniqueId"})`
      );
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract", [], {
              id: "same",
            });
            const sameContract2 = m.contract("SameContract", [], {
              id: "same",
            });

            return { sameContract1, sameContract2 };
          }),
        'The future id "same" is already used, please provide a different one.'
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate a non-bignumber value option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", [], { value: 42 as any });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid option "value" received. It should be a bigint, a module parameter, or a value obtained from an event or static call./
        );
      });

      it("should not validate a non-address from option", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", [], { from: 1 as any });

              return { another };
            }),
          /IGN702: Module validation failed with reason: Invalid type for option "from": number/
        );
      });

      it("should not validate a non-contract library", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              const call = m.call(another, "test");

              const test = m.contract("Test", [], {
                libraries: { Call: call as any },
              });

              return { another, test };
            }),
          /IGN702: Module validation failed with reason: The value you provided for the library 'Call' is not a valid Future or it doesn't represent a contract/
        );
      });
    });

    it("should not validate an invalid artifact", async () => {
      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another");

        return { another };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({
            Another: {} as any,
          }),
          {},
          []
        ),
        "Artifact for contract 'Another' is invalid"
      );
    });

    it("should not validate an incorrect number of constructor args", async () => {
      const module = buildModule("Module1", (m) => {
        const contract1 = m.contract("Test", [1, 2, 3]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakeArtifact }),
          {},
          []
        ),
        "The constructor of the contract 'Test' expects 0 arguments but 3 were given"
      );
    });

    it("should not validate a missing module parameter", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "uint256",
                name: "p",
                type: "uint256",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const contract1 = m.contract("Test", [p]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          []
        ),
        "Module parameter 'p' requires a value but was given none"
      );
    });

    it("should not validate a module parameter of the wrong type for value", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", false as unknown as bigint);
        const contract1 = m.contract("Test", [], { value: p });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
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
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 42n);
        const contract1 = m.contract("Test", [], { value: p });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      await assert.isFulfilled(
        validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
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
                internalType: "uint256",
                name: "p",
                type: "uint256",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Test", [p]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      const result = await validateNamedContractDeployment(
        future as any,
        setupMockArtifactResolver({ Test: fakerArtifact }),
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
                internalType: "uint256",
                name: "p",
                type: "uint256",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const contract1 = m.contract("Test", [p]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      const result = await validateNamedContractDeployment(
        future as any,
        setupMockArtifactResolver({ Test: fakerArtifact }),
        {
          $global: { p: 123 },
        },
        []
      );

      assert.deepEqual(result, []);
    });

    it("should not validate a missing module parameter (deeply nested)", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        abi: [
          {
            inputs: [
              {
                internalType: "uint256",
                name: "p",
                type: "uint256",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const contract1 = m.contract("Test", [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
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
                internalType: "uint256",
                name: "p",
                type: "uint256",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Test", [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      await assert.isFulfilled(
        validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
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
                name: "p",
                type: "address",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", m.getAccount(1));
        const contract1 = m.contract("Test", [p]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      await assert.isFulfilled(
        validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
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
                name: "p",
                type: "address",
              },
            ],
            stateMutability: "payable",
            type: "constructor",
          },
        ],
      };

      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", m.getAccount(-1));
        const contract1 = m.contract("Test", [p]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          []
        ),
        "Account index cannot be a negative number"
      );
    });

    it("should not validate a negative account index", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(-1);
        const contract1 = m.contract("Test", [], { from: account });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakeArtifact }),
          {},
          []
        ),
        "Account index cannot be a negative number"
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(1);
        const contract1 = m.contract("Test", [], { from: account });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateNamedContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakeArtifact }),
          {},
          []
        ),
        "Requested account index '1' is greater than the total number of available accounts '0'"
      );
    });
  });
});
