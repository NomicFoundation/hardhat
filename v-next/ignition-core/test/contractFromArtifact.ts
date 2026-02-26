import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { type Artifact, FutureType } from "../src/index.js";
import { buildModule } from "../src/build-module.js";
import {
  AccountRuntimeValueImplementation,
  ArtifactContractDeploymentFutureImplementation,
  ModuleParameterRuntimeValueImplementation,
} from "../src/internal/module.js";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module.js";
import { validateArtifactContractDeployment } from "../src/internal/validation/futures/validateArtifactContractDeployment.js";

import {
  assertInstanceOf,
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers.js";

describe("contractFromArtifact", () => {
  it("should be able to deploy with a contract based on an artifact", () => {
    const moduleWithContractFromArtifact = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1", fakeArtifact, [
        1,
        "a",
        BigInt("9007199254740991"),
      ]);

      return { contract1 };
    });

    assert.isDefined(moduleWithContractFromArtifact);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithContractFromArtifact.id, "Module1");
    assert.equal(
      moduleWithContractFromArtifact.results.contract1.id,
      "Module1#Contract1",
    );

    // Stores the arguments
    assert.deepStrictEqual(
      moduleWithContractFromArtifact.results.contract1.constructorArgs,
      [1, "a", BigInt("9007199254740991")],
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an arg dependency", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another", fakeArtifact, [example]);

      return { example, another };
    });

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass an after dependency", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another", fakeArtifact, [], {
        after: [example, otherModule],
      });

      return { example, another };
    });

    assert.equal(moduleWithDependentContracts.futures.size, 2);

    const exampleFuture = moduleWithDependentContracts.results.example;
    const anotherFuture = moduleWithDependentContracts.results.another;

    assert.equal(anotherFuture.dependencies.size, 2);
    assert(anotherFuture.dependencies.has(exampleFuture!));
    assert(anotherFuture.dependencies.has(otherModule));
  });

  it("should be able to pass a library as a dependency of a contract", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.library("Example");
      const another = m.contract("Another", fakeArtifact, [], {
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
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert.equal(anotherFuture.libraries.Example.id, exampleFuture?.id);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass value as an option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", fakeArtifact, [], {
        value: BigInt(42),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.value, BigInt(42));
  });

  it("Should be able to pass a ModuleParameterRuntimeValue as a value option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", fakeArtifact, [], {
        value: m.getParameter("value"),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assertInstanceOf(
      anotherFuture.value,
      ModuleParameterRuntimeValueImplementation,
    );
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", fakeArtifact, [], {
        from: "0x2",
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const another = m.contract("Another", fakeArtifact, [], {
        from: m.getAccount(1),
      });

      return { another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Another",
    );

    if (
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assertInstanceOf(anotherFuture.from, AccountRuntimeValueImplementation);
    assert.equal(anotherFuture.from.accountIndex, 1);
  });

  describe("Arguments", () => {
    it("Should support base values as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1", fakeArtifact, [
          1,
          true,
          "string",
          4n,
        ]);

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
        const contract1 = m.contract("Contract1", fakeArtifact, [[1, 2, 3n]]);

        return { contract1 };
      });

      assert.deepEqual(module.results.contract1.constructorArgs[0], [1, 2, 3n]);
    });

    it("Should support objects as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1", fakeArtifact, [
          { a: 1, b: [1, 2] },
        ]);

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
        const contract2 = m.contract("Contract2", fakeArtifact, [contract1]);

        return { contract1, contract2 };
      });

      assert.equal(
        module.results.contract2.constructorArgs[0],
        module.results.contract1,
      );
    });

    it("should support nested futures as arguments", () => {
      const module = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", fakeArtifact, [
          { arr: [contract1] },
        ]);

        return { contract1, contract2 };
      });

      assert.equal(
        (module.results.contract2.constructorArgs[0] as any).arr[0],
        module.results.contract1,
      );
    });

    it("should support AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1", fakeArtifact, [account1]);

        return { contract1 };
      });

      assertInstanceOf(
        module.results.contract1.constructorArgs[0],
        AccountRuntimeValueImplementation,
      );
      assert.equal(module.results.contract1.constructorArgs[0].accountIndex, 1);
    });

    it("should support nested AccountRuntimeValues as arguments", () => {
      const module = buildModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contract("Contract1", fakeArtifact, [
          { arr: [account1] },
        ]);

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
        const contract1 = m.contract("Contract1", fakeArtifact, [p]);

        return { contract1 };
      });

      assertInstanceOf(
        module.results.contract1.constructorArgs[0],
        ModuleParameterRuntimeValueImplementation,
      );
      assert.equal(module.results.contract1.constructorArgs[0].name, "p");
      assert.equal(
        module.results.contract1.constructorArgs[0].defaultValue,
        123,
      );
    });

    it("should support nested ModuleParameterRuntimeValue as arguments", () => {
      const module = buildModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contract("Contract1", fakeArtifact, [{ arr: [p] }]);

        return { contract1 };
      });

      const param = (module.results.contract1.constructorArgs[0] as any).arr[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.equal(param.defaultValue, 123);
    });
  });

  describe("passing id", () => {
    it("should use contract from artifact twice by passing an id", () => {
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("SameContract", fakeArtifact, [], {
          id: "first",
        });
        const sameContract2 = m.contract("SameContract", fakeArtifact, [], {
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

    it("should throw if the same contract is deployed twice without differentiating ids", () => {
      assertThrowsHardhatError(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract", fakeArtifact);
            const sameContract2 = m.contract("SameContract", fakeArtifact);

            return { sameContract1, sameContract2 };
          }),
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The autogenerated future id ("Module1#SameContract") is already used. Please provide a unique id, as shown below:

m.contract(..., { id: "MyUniqueId"})`,
        },
      );
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      assertThrowsHardhatError(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contract("SameContract", fakeArtifact, [], {
              id: "same",
            });
            const sameContract2 = m.contract("SameContract", fakeArtifact, [], {
              id: "same",
            });

            return { sameContract1, sameContract2 };
          }),
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message:
            'The future id "same" is already used, please provide a different one.',
        },
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate a non-bignumber value option", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", fakeArtifact, [], {
                value: 42 as any,
              });

              return { another };
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          {
            message:
              'Invalid option "value" received. It should be a bigint, a module parameter, or a value obtained from an event or static call.',
          },
        );
      });

      it("should not validate a non-address from option", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", fakeArtifact, [], {
                from: 1 as any,
              });

              return { another };
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          {
            message: 'Invalid type for option "from": number',
          },
        );
      });

      it("should not validate a non-contract library", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);
              const call = m.call(another, "test");

              const test = m.contract("Test", fakeArtifact, [], {
                libraries: { Call: call as any },
              });

              return { another, test };
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          {
            message:
              "The value you provided for the library 'Call' is not a valid Future or it doesn't represent a contract",
          },
        );
      });

      it("should not validate an invalid artifact", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", {} as Artifact, []);

              return { another };
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          {
            message: "Invalid artifact given",
          },
        );
      });
    });

    it("should not validate an incorrect number of constructor args", async () => {
      const module = buildModule("Module1", (m) => {
        const contract1 = m.contract("Test", fakeArtifact, [1, 2, 3]);

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver(),
          {},
          [],
        ),
        "The constructor of the contract 'Test' expects 0 arguments but 3 were given",
      );
    });

    it("should not validate a missing module parameter", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const contract1 = m.contract("Test", fakeArtifact, [p]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakeArtifact }),
          {},
          [],
        ),
        "Module parameter 'p' requires a value but was given none",
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
        const contract1 = m.contract("Test", fakerArtifact, [p]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      const result = await validateArtifactContractDeployment(
        future as any,
        setupMockArtifactResolver({ Test: fakerArtifact }),
        {},
        [],
      );

      assert.deepStrictEqual(result, []);
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
        const contract1 = m.contract("Test", fakerArtifact, [p]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      const result = await validateArtifactContractDeployment(
        future as any,
        setupMockArtifactResolver({ Test: fakerArtifact }),
        {
          $global: {
            p: 123,
          },
        },
        [],
      );

      assert.deepStrictEqual(result, []);
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
        const contract1 = m.contract("Test", fakerArtifact, [], {
          value: p,
        });

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          [],
        ),
        "Module parameter 'p' must be of type 'bigint' but is 'boolean'",
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
        const contract1 = m.contract("Test", fakerArtifact, [], {
          value: p,
        });

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      await assert.isFulfilled(
        validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          [],
        ),
      );
    });

    it("should not validate a missing module parameter (deeply nested)", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const contract1 = m.contract("Test", fakeArtifact, [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakeArtifact }),
          {},
          [],
        ),
        "Module parameter 'p' requires a value but was given none",
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
        const contract1 = m.contract("Test", fakerArtifact, [
          [123, { really: { deeply: { nested: [p] } } }],
        ]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      await assert.isFulfilled(
        validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          [],
        ),
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
        const contract1 = m.contract("Test", fakerArtifact, [p]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      await assert.isFulfilled(
        validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          [],
        ),
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
        const contract1 = m.contract("Test", fakerArtifact, [p]);

        return { contract1 };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_DEPLOYMENT,
      );

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver({ Test: fakerArtifact }),
          {},
          [],
        ),
        "Account index cannot be a negative number",
      );
    });

    it("should not validate a negative account index", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(-1);
        const contract1 = m.contract("Test", fakeArtifact, [], {
          from: account,
        });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver(),
          {},
          [],
        ),
        "Account index cannot be a negative number",
      );
    });

    it("should not validate an account index greater than the number of available accounts", async () => {
      const module = buildModule("Module1", (m) => {
        const account = m.getAccount(1);
        const contract1 = m.contract("Test", fakeArtifact, [], {
          from: account,
        });

        return { contract1 };
      });

      const [future] = getFuturesFromModule(module);

      assertValidationError(
        await validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver(),
          {},
          [],
        ),
        "Requested account index '1' is greater than the total number of available accounts '0'",
      );
    });
  });
});
