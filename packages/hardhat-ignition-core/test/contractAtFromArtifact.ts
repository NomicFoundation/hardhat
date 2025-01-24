/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { FutureType } from "../src";
import { buildModule } from "../src/build-module";
import { ModuleParameterRuntimeValueImplementation } from "../src/internal/module";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module";
import { validateArtifactContractAt } from "../src/internal/validation/futures/validateArtifactContractAt";

import {
  assertInstanceOf,
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers";

describe("contractAtFromArtifact", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  it("should be able to setup a contract at a given address", () => {
    const moduleWithContractFromArtifact = buildModule("Module1", (m) => {
      const contract1 = m.contractAt("Contract1", fakeArtifact, exampleAddress);

      return { contract1 };
    });

    assert.isDefined(moduleWithContractFromArtifact);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithContractFromArtifact.id, "Module1");
    assert.equal(
      moduleWithContractFromArtifact.results.contract1.id,
      "Module1#Contract1"
    );

    // Stores the address
    assert.deepStrictEqual(
      moduleWithContractFromArtifact.results.contract1.address,
      exampleAddress
    );

    // 1 contract future
    assert.equal(moduleWithContractFromArtifact.futures.size, 1);

    // No submodules
    assert.equal(moduleWithContractFromArtifact.submodules.size, 0);
  });

  it("should be able to pass an after dependency", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contractAt("Another", fakeArtifact, exampleAddress, {
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

  it("should be able to pass a static call future as the address", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const call = m.staticCall(example, "getAddress");

      const another = m.contractAt("Another", fakeArtifact, call);

      return { example, another };
    });

    assert.equal(moduleWithDependentContracts.futures.size, 3);

    const anotherFuture = moduleWithDependentContracts.results.another;

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1#Example.getAddress"
    );

    assert.equal(anotherFuture.dependencies.size, 1);
    assert(anotherFuture.dependencies.has(callFuture!));
  });

  it("Should be able to pass a module param as address", () => {
    const module = buildModule("Module", (m) => {
      const paramWithDefault = m.getParameter("addressWithDefault", "0x000000");
      const paramWithoutDefault = m.getParameter("addressWithoutDefault");

      const withDefault = m.contractAt("C", fakeArtifact, paramWithDefault);
      const withoutDefault = m.contractAt(
        "C2",
        fakeArtifact,
        paramWithoutDefault
      );

      return { withDefault, withoutDefault };
    });

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
      const moduleWithSameContractTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contractAt(
          "SameContract",
          fakeArtifact,
          exampleAddress,
          { id: "first" }
        );
        const sameContract2 = m.contractAt(
          "SameContract",
          fakeArtifact,
          differentAddress,
          {
            id: "second",
          }
        );

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
            const sameContract1 = m.contractAt(
              "SameContract",
              fakeArtifact,
              exampleAddress
            );
            const sameContract2 = m.contractAt(
              "SameContract",
              fakeArtifact,
              "0x123"
            );

            return { sameContract1, sameContract2 };
          }),
        `The autogenerated future id ("Module1#SameContract") is already used. Please provide a unique id, as shown below:

m.contractAt(..., { id: "MyUniqueId"})`
      );
    });

    it("should throw if a contract tries to pass the same id twice", () => {
      assert.throws(
        () =>
          buildModule("Module1", (m) => {
            const sameContract1 = m.contractAt(
              "SameContract",
              fakeArtifact,
              exampleAddress,
              {
                id: "same",
              }
            );
            const sameContract2 = m.contractAt(
              "SameContract",
              fakeArtifact,
              "0x123",
              {
                id: "same",
              }
            );

            return { sameContract1, sameContract2 };
          }),
        'The future id "same" is already used, please provide a different one.'
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate an invalid address", () => {
        assert.throws(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contractAt("Another", fakeArtifact, 42 as any);

              return { another };
            }),
          /Invalid parameter "address" provided to contractAt "Another" in module "Module1"/
        );
      });
    });

    it("should not validate a missing module parameter", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const another = m.contractAt("Another", fakeArtifact, p);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_AT
      );

      assertValidationError(
        await validateArtifactContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: fakeArtifact,
          }),
          {},
          []
        ),
        "Module parameter 'p' requires a value but was given none"
      );
    });

    it("should validate a missing module parameter if a default parameter is present", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", "0x1234");
        const another = m.contractAt("Another", fakeArtifact, p);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_AT
      );

      const result = await validateArtifactContractAt(
        future as any,
        setupMockArtifactResolver({
          Another: fakeArtifact,
        }),
        {},
        []
      );

      assert.deepStrictEqual(result, []);
    });

    it("should validate a missing module parameter if a global parameter is present", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p");
        const another = m.contractAt("Another", fakeArtifact, p);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_AT
      );

      const result = await validateArtifactContractAt(
        future as any,
        setupMockArtifactResolver({
          Another: fakeArtifact,
        }),
        {
          $global: {
            p: "0x1234",
          },
        },
        []
      );

      assert.deepStrictEqual(result, []);
    });

    it("should not validate a module parameter of the wrong type", async () => {
      const module = buildModule("Module1", (m) => {
        const p = m.getParameter("p", 123 as unknown as string);
        const another = m.contractAt("Another", fakeArtifact, p);

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.CONTRACT_AT
      );

      assertValidationError(
        await validateArtifactContractAt(
          future as any,
          setupMockArtifactResolver({
            Another: fakeArtifact,
          }),
          {},
          []
        ),
        "Module parameter 'p' must be of type 'string' but is 'number'"
      );
    });
  });
});
