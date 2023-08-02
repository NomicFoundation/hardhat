/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact, FutureType } from "../../src";
import { buildModule } from "../../src/new-api/build-module";
import { ModuleParameterRuntimeValueImplementation } from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { getFuturesFromModule } from "../../src/new-api/internal/utils/get-futures-from-module";
import { validateNamedContractAt } from "../../src/new-api/internal/validation/futures/validateNamedContractAt";

import { assertInstanceOf, setupMockArtifactResolver } from "./helpers";

describe("contractAt", () => {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  it("should be able to setup a contract at a given address", () => {
    const moduleWithContractFromArtifactDefinition = buildModule(
      "Module1",
      (m) => {
        const contract1 = m.contractAt("Contract1", "0xtest");

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

    // Stores the address
    assert.deepStrictEqual(
      moduleWithContractFromArtifact.results.contract1.address,
      "0xtest"
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an after dependency", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const another = m.contractAt("Another", "0xtest", {
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

  it("should be able to pass a static call future as the address", () => {
    const moduleWithDependentContractsDefinition = buildModule(
      "Module1",
      (m) => {
        const example = m.contract("Example");
        const call = m.staticCall(example, "getAddress");

        const another = m.contractAt("Another", call);

        return { example, another };
      }
    );

    const constructor = new ModuleConstructor();
    const moduleWithDependentContracts = constructor.construct(
      moduleWithDependentContractsDefinition
    );

    assert.equal(moduleWithDependentContracts.futures.size, 3);

    const anotherFuture = moduleWithDependentContracts.results.another;

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example#getAddress"
    );

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(callFuture!));
  });

  it("Should be able to pass a module param as address", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const paramWithDefault = m.getParameter("addressWithDefault", "0x000000");
      const paramWithoutDefault = m.getParameter("addressWithoutDefault");

      const withDefault = m.contractAt("C", paramWithDefault);
      const withoutDefault = m.contractAt("C2", paramWithoutDefault);

      return { withDefault, withoutDefault };
    });

    const constructor = new ModuleConstructor();
    const module = constructor.construct(moduleDefinition);

    assertInstanceOf(
      module.results.withDefault.address,
      ModuleParameterRuntimeValueImplementation
    );
    assert.equal(module.results.withDefault.address.name, "addressWithDefault");
    assert.equal(module.results.withDefault.address.defaultValue, "0x000000");

    assertInstanceOf(
      module.results.withoutDefault.address,
      ModuleParameterRuntimeValueImplementation
    );
    assert.equal(
      module.results.withoutDefault.address.name,
      "addressWithoutDefault"
    );
    assert.equal(module.results.withoutDefault.address.defaultValue, undefined);
  });

  describe("passing id", () => {
    it("should be able to deploy the same contract twice by passing an id", () => {
      const moduleWithSameContractTwiceDefinition = buildModule(
        "Module1",
        (m) => {
          const sameContract1 = m.contractAt(
            "SameContract",
            "0x123",

            { id: "first" }
          );
          const sameContract2 = m.contractAt(
            "SameContract",
            "0x123",

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
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.contractAt("SameContract", "0x123");
        const sameContract2 = m.contractAt("SameContract", "0x123");

        return { sameContract1, sameContract2 };
      });

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleDefinition),
        /Duplicated id Module1:SameContract found in module Module1/
      );
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const sameContract1 = m.contractAt(
          "SameContract",
          "0x123",

          {
            id: "same",
          }
        );
        const sameContract2 = m.contractAt(
          "SameContract",
          "0x123",

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
    it("should not validate an invalid address", () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const another = m.contractAt("Another", 42 as any);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();

      assert.throws(
        () => constructor.construct(moduleWithDependentContractsDefinition),
        /Invalid address given/
      );
    });

    it("should not validate a missing module parameter", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const p = m.getParameter("p");
          const another = m.contractAt("Another", p);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.NAMED_CONTRACT_AT
      );

      await assert.isRejected(
        validateNamedContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: fakeArtifact,
          }),
          {}
        ),
        /Module parameter 'p' requires a value but was given none/
      );
    });

    it("should validate a missing module parameter if a default parameter is present", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const p = m.getParameter("p", "0x1234");
          const another = m.contractAt("Another", p);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.NAMED_CONTRACT_AT
      );

      await assert.isFulfilled(
        validateNamedContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: fakeArtifact,
          }),
          {}
        )
      );
    });

    it("should not validate a module parameter of the wrong type", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const p = m.getParameter("p", 123 as unknown as string);
          const another = m.contractAt("Another", p);

          return { another };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.NAMED_CONTRACT_AT
      );

      await assert.isRejected(
        validateNamedContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: fakeArtifact,
          }),
          {}
        ),
        /Module parameter 'p' must be of type 'string' but is 'number'/
      );
    });

    it("should not validate an invalid artifact", async () => {
      const moduleWithDependentContractsDefinition = buildModule(
        "Module1",
        (m) => {
          const another = m.contractAt("Another", "");

          return { another };
        }
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(
        moduleWithDependentContractsDefinition
      );
      const [future] = getFuturesFromModule(module);

      await assert.isRejected(
        validateNamedContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: {} as any,
          }),
          {}
        ),
        /Artifact for contract 'Another' is invalid/
      );
    });
  });
});
