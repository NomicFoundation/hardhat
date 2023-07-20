import { assert } from "chai";

import { Artifact } from "../../src";
import { defineModule } from "../../src/new-api/define-module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import { validate } from "../../src/new-api/internal/validation/validate";

import { setupMockArtifactResolver } from "./helpers";

describe("useModule", () => {
  it("should be able to use a submodule", () => {
    const submoduleDefinition = defineModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = defineModule("Module1", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    const constructor = new ModuleConstructor();
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    // the submodule is linked
    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("returns the same result set (object equal) for each usage", () => {
    const submoduleDefinition = defineModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = defineModule("Module1", (m) => {
      const { contract1: first } = m.useModule(submoduleDefinition);
      const { contract1: second } = m.useModule(submoduleDefinition);

      return { first, second };
    });

    const constructor = new ModuleConstructor();
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    assert.equal(
      moduleWithSubmodule.results.first,
      moduleWithSubmodule.results.second
    );

    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("supports dependending on returned results", () => {
    const submoduleDefinition = defineModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = defineModule("Module1", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      const contract2 = m.contract("Contract2", [contract1]);

      return { contract2 };
    });

    const constructor = new ModuleConstructor();
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    assert(
      moduleWithSubmodule.results.contract2.dependencies.has(
        submodule.results.contract1
      )
    );
  });

  describe("validation", () => {
    it("should validate nested module parameters", async () => {
      const fakeArtifact: Artifact = {
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
        contractName: "",
        bytecode: "",
        linkReferences: {},
      };

      const submoduleDefinition = defineModule("Submodule1", (m) => {
        const param1 = m.getParameter("param1");
        const contract1 = m.contract("Contract1", [param1]);

        return { contract1 };
      });

      const submodule2Definition = defineModule("Submodule2", (m) => {
        const { contract1 } = m.useModule(submoduleDefinition);

        const param2 = m.getParameter("param2");
        const contract2 = m.contract("Contract2", [param2]);

        return { contract1, contract2 };
      });

      const moduleWithSubmoduleDefinition = defineModule("Module1", (m) => {
        const { contract1, contract2 } = m.useModule(submodule2Definition);

        const param3 = m.getParameter("param3");
        const contract3 = m.contract("Contract3", [param3]);

        return { contract1, contract2, contract3 };
      });

      const moduleParams = {
        Submodule1: {
          param1: 42,
        },
        Submodule2: {
          param2: 123,
        },
        Module1: {
          param3: 40,
        },
      };

      const constructor = new ModuleConstructor(moduleParams);
      // const submodule = constructor.construct(submoduleDefinition);
      const moduleWithSubmodule = constructor.construct(
        moduleWithSubmoduleDefinition
      );

      await assert.isFulfilled(
        validate(
          moduleWithSubmodule,
          setupMockArtifactResolver({
            Contract1: fakeArtifact,
            Contract2: fakeArtifact,
            Contract3: fakeArtifact,
          }),
          moduleParams
        )
      );
    });

    it("should not validate missing module parameters is deeply nested submodules", async () => {
      const fakeArtifact: Artifact = {
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
        contractName: "",
        bytecode: "",
        linkReferences: {},
      };

      const submoduleDefinition = defineModule("Submodule1", (m) => {
        const param1 = m.getParameter("param1");
        const contract1 = m.contract("Contract1", [param1]);

        return { contract1 };
      });

      const submodule2Definition = defineModule("Submodule2", (m) => {
        const { contract1 } = m.useModule(submoduleDefinition);

        const param2 = m.getParameter("param2");
        const contract2 = m.contract("Contract2", [param2]);

        return { contract1, contract2 };
      });

      const moduleWithSubmoduleDefinition = defineModule("Module1", (m) => {
        const { contract1, contract2 } = m.useModule(submodule2Definition);

        const param3 = m.getParameter("param3");
        const contract3 = m.contract("Contract3", [param3]);

        return { contract1, contract2, contract3 };
      });

      const moduleParams = {
        Submodule2: {
          param2: 123,
        },
        Module1: {
          param3: 40,
        },
      };

      const constructor = new ModuleConstructor(moduleParams);
      // const submodule = constructor.construct(submoduleDefinition);
      const moduleWithSubmodule = constructor.construct(
        moduleWithSubmoduleDefinition
      );

      await assert.isRejected(
        validate(
          moduleWithSubmodule,
          setupMockArtifactResolver({
            Contract1: fakeArtifact,
            Contract2: fakeArtifact,
            Contract3: fakeArtifact,
          }),
          moduleParams
        ),
        /Module parameter 'param1' requires a value but was given none/
      );
    });
  });
});
