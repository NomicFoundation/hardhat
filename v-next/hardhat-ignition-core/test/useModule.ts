/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact, DeploymentResultType } from "../src";
import { buildModule } from "../src/build-module";
import { validate } from "../src/internal/validation/validate";

import { fakeArtifact, setupMockArtifactResolver } from "./helpers";

describe("useModule", () => {
  it("should be able to use a submodule", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submodule);

      return { contract1 };
    });

    // the submodule is linked
    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("returns the same result set (object equal) for each usage", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1: first } = m.useModule(submodule);
      const { contract1: second } = m.useModule(submodule);

      return { first, second };
    });

    assert.equal(
      moduleWithSubmodule.results.first,
      moduleWithSubmodule.results.second,
    );

    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("supports dependending on returned results", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submodule);

      const contract2 = m.contract("Contract2", [contract1]);

      return { contract2 };
    });

    assert(
      moduleWithSubmodule.results.contract2.dependencies.has(
        submodule.results.contract1,
      ),
    );
  });

  describe("validation", () => {
    it("should validate nested module parameters", async () => {
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

      const submodule = buildModule("Submodule1", (m) => {
        const param1 = m.getParameter("param1");
        const contract1 = m.contract("Contract1", [param1]);

        return { contract1 };
      });

      const submodule2 = buildModule("Submodule2", (m) => {
        const { contract1 } = m.useModule(submodule);

        const param2 = m.getParameter("param2");
        const contract2 = m.contract("Contract2", [param2]);

        return { contract1, contract2 };
      });

      const moduleWithSubmodule = buildModule("Module1", (m) => {
        const { contract1, contract2 } = m.useModule(submodule2);

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

      await assert.isFulfilled(
        validate(
          moduleWithSubmodule,
          setupMockArtifactResolver({
            Contract1: fakerArtifact,
            Contract2: fakerArtifact,
            Contract3: fakerArtifact,
          }),
          moduleParams,
          [],
        ),
      );
    });

    it("should not validate missing module parameters is deeply nested submodules", async () => {
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

      const submodule = buildModule("Submodule1", (m) => {
        const param1 = m.getParameter("param1");
        const contract1 = m.contract("Contract1", [param1]);

        return { contract1 };
      });

      const submodule2 = buildModule("Submodule2", (m) => {
        const { contract1 } = m.useModule(submodule);

        const param2 = m.getParameter("param2");
        const contract2 = m.contract("Contract2", [param2]);

        return { contract1, contract2 };
      });

      const moduleWithSubmodule = buildModule("Module1", (m) => {
        const { contract1, contract2 } = m.useModule(submodule2);

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

      const result = await validate(
        moduleWithSubmodule,
        setupMockArtifactResolver({
          Contract1: fakerArtifact,
          Contract2: fakerArtifact,
          Contract3: fakerArtifact,
        }),
        moduleParams,
        [],
      );

      assert.deepStrictEqual(result, {
        type: DeploymentResultType.VALIDATION_ERROR,
        errors: {
          "Submodule1#Contract1": [
            "IGN725: Module parameter 'param1' requires a value but was given none",
          ],
        },
      });
    });
  });
});
