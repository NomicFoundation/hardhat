import { assert } from "chai";

import { Artifact } from "../../src";
import { defineModule } from "../../src/new-api/define-module";
import {
  AccountRuntimeValueImplementation,
  ArtifactContractDeploymentFutureImplementation,
  ModuleParameterRuntimeValueImplementation,
} from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { getFuturesFromModule } from "../../src/new-api/internal/utils/get-futures-from-module";
import { validateArtifactContractDeployment } from "../../src/new-api/internal/validation/futures/validateArtifactContractDeployment";

import { assertInstanceOf, setupMockArtifactResolver } from "./helpers";

describe("contractFromArtifact", () => {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  it("should be able to deploy with a contract based on an artifact", () => {
    const moduleWithContractFromArtifactDefinition = defineModule(
      "Module1",
      (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          1,
          "a",
          BigInt("9007199254740991"),
        ]);

        return { contract1 };
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
      moduleWithContractFromArtifact.results.contract1.id,
      "Module1:Contract1"
    );

    // Stores the arguments
    assert.deepStrictEqual(
      moduleWithContractFromArtifact.results.contract1.constructorArgs,
      [1, "a", BigInt("9007199254740991")]
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an arg dependency", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contractFromArtifact("Another", fakeArtifact, [
          example,
        ]);

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

  it("should be able to pass an after dependency", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contractFromArtifact("Another", fakeArtifact, [], {
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

  it("should be able to pass a library as a dependency of a contract", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const example = m.library("Example");
        const another = m.contractFromArtifact("Another", fakeArtifact, [], {
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
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.dependencies.size, 1);
    assert.equal(anotherFuture.libraries.Example.id, exampleFuture?.id);
    assert(anotherFuture.dependencies.has(exampleFuture!));
  });

  it("should be able to pass value as an option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const another = m.contractFromArtifact("Another", fakeArtifact, [], {
          value: BigInt(42),
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
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.value, BigInt(42));
  });

  it("should be able to pass a string as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const another = m.contractFromArtifact("Another", fakeArtifact, [], {
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
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assert.equal(anotherFuture.from, "0x2");
  });

  it("Should be able to pass an AccountRuntimeValue as from option", () => {
    const moduleWithDependentContractsDefinition = defineModule(
      "Module1",
      (m) => {
        const another = m.contractFromArtifact("Another", fakeArtifact, [], {
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
      !(anotherFuture instanceof ArtifactContractDeploymentFutureImplementation)
    ) {
      assert.fail("Not an artifact contract deployment");
    }

    assertInstanceOf(anotherFuture.from, AccountRuntimeValueImplementation);
    assert.equal(anotherFuture.from.accountIndex, 1);
  });

  describe("Arguments", () => {
    it("Should support base values as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          1,
          true,
          "string",
          4n,
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assert.deepEqual(module.results.contract1.constructorArgs, [
        1,
        true,
        "string",
        4n,
      ]);
    });

    it("Should support arrays as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          [1, 2, 3n],
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assert.deepEqual(module.results.contract1.constructorArgs[0], [1, 2, 3n]);
    });

    it("Should support objects as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          { a: 1, b: [1, 2] },
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assert.deepEqual(module.results.contract1.constructorArgs[0], {
        a: 1,
        b: [1, 2],
      });
    });

    it("Should support futures as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contractFromArtifact("Contract2", fakeArtifact, [
          contract1,
        ]);

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assert.equal(
        module.results.contract2.constructorArgs[0],
        module.results.contract1
      );
    });

    it("should support nested futures as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contractFromArtifact("Contract2", fakeArtifact, [
          { arr: [contract1] },
        ]);

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assert.equal(
        (module.results.contract2.constructorArgs[0] as any).arr[0],
        module.results.contract1
      );
    });

    it("should support AccountRuntimeValues as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          account1,
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      assertInstanceOf(
        module.results.contract1.constructorArgs[0],
        AccountRuntimeValueImplementation
      );
      assert.equal(module.results.contract1.constructorArgs[0].accountIndex, 1);
    });

    it("should support nested AccountRuntimeValues as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const account1 = m.getAccount(1);
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          { arr: [account1] },
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const account = (module.results.contract1.constructorArgs[0] as any)
        .arr[0];

      assertInstanceOf(account, AccountRuntimeValueImplementation);

      assert.equal(account.accountIndex, 1);
    });

    it("should support ModuleParameterRuntimeValue as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          p,
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

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
      const moduleDefinition = defineModule("Module", (m) => {
        const p = m.getParameter("p", 123);
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
          { arr: [p] },
        ]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor();
      const module = constructor.construct(moduleDefinition);

      const param = (module.results.contract1.constructorArgs[0] as any).arr[0];
      assertInstanceOf(param, ModuleParameterRuntimeValueImplementation);
      assert.equal(param.name, "p");
      assert.equal(param.defaultValue, 123);
    });
  });

  describe("passing id", () => {
    it("should use contract from artifact twice by passing an id", () => {
      const moduleWithSameContractTwiceDefinition = defineModule(
        "Module1",
        (m) => {
          const sameContract1 = m.contractFromArtifact(
            "SameContract",
            fakeArtifact,
            [],
            { id: "first" }
          );
          const sameContract2 = m.contractFromArtifact(
            "SameContract",
            fakeArtifact,
            [],
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

    it("should throw if the same contract is deployed twice without differentiating ids", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contractFromArtifact(
          "SameContract",
          fakeArtifact
        );
        const sameContract2 = m.contractFromArtifact(
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

    it("should throw if a contract tries to pass the same id twice", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const sameContract1 = m.contractFromArtifact(
          "SameContract",
          fakeArtifact,
          [],
          {
            id: "same",
          }
        );
        const sameContract2 = m.contractFromArtifact(
          "SameContract",
          fakeArtifact,
          [],
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
    it("should not validate a non-bignumber value option", () => {
      const moduleWithDependentContractsDefinition = defineModule(
        "Module1",
        (m) => {
          const another = m.contractFromArtifact("Another", fakeArtifact, [], {
            value: 42 as any,
          });

          return { another };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Given value option '42' is not a `bigint`/
      );
    });

    it("should not validate a non-address from option", () => {
      const moduleWithDependentContractsDefinition = defineModule(
        "Module1",
        (m) => {
          const another = m.contractFromArtifact("Another", fakeArtifact, [], {
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
      const moduleWithDependentContractsDefinition = defineModule(
        "Module1",
        (m) => {
          const another = m.contract("Another", []);
          const call = m.call(another, "test");

          const test = m.contractFromArtifact("Test", fakeArtifact, [], {
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
      const moduleWithDependentContractsDefinition = defineModule(
        "Module1",
        (m) => {
          const another = m.contractFromArtifact("Another", {} as Artifact, []);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Invalid artifact given/
      );
    });

    it("should not validate an incorrect number of constructor args", async () => {
      const moduleWithContractFromArtifactDefinition = defineModule(
        "Module1",
        (m) => {
          const contract1 = m.contractFromArtifact(
            "Test",
            fakeArtifact,
            [1, 2, 3]
          );

          return { contract1 };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithContractFromArtifactDefinition
      );
      const [future] = getFuturesFromModule(module);

      await assert.isRejected(
        validateArtifactContractDeployment(
          future as any,
          setupMockArtifactResolver(fakeArtifact)
        ),
        /The constructor of the contract 'Test' expects 0 arguments but 3 were given/
      );
    });
  });
});
