/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { generateRecipeGraphFrom } from "process/generateRecipeGraphFrom";
import { buildModule } from "recipe/buildModule";
import { buildRecipe } from "recipe/buildRecipe";
import { Artifact } from "types/hardhat";
import type { IRecipeGraphBuilder } from "types/recipeGraph";
import { validateRecipeGraph } from "validation/validateRecipeGraph";

import { getMockServices } from "./helpers";

describe("Validation", () => {
  const exampleArtifact: Artifact = {
    contractName: "Example",
    abi: [],
    bytecode: "0x0",
    linkReferences: {},
  };

  describe("artifact contract deploy", () => {
    it("should validate a correct artifact contract deploy", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Example", exampleArtifact);

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact contract deploy with the wrong number of args", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "The constructor of the contract 'Example' expects 0 arguments but 3 were given"
      );
    });
  });

  describe("artifact library deploy", () => {
    it("should validate a correct artifact library deploy", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.library("Example", exampleArtifact);

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact library deploy with the wrong number of args", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "The constructor of the library 'Example' expects 0 arguments but 3 were given"
      );
    });
  });

  describe("call", () => {
    const exampleCallArtifact = {
      _format: "hh-sol-artifact-1",
      contractName: "Foo",
      sourceName: "contracts/Foo.sol",
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
        {
          inputs: [
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
        {
          inputs: [
            {
              internalType: "uint256",
              name: "n",
              type: "uint256",
            },
          ],
          name: "sub",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "x",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      bytecode: "0x0",
      deployedBytecode: "0x0",
      linkReferences: {},
      deployedLinkReferences: {},
    };

    it("should validate a correct call", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "sub", { args: [2] });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);
      assert.equal(validationResult._kind, "success");
    });

    it("should validate an overriden call", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "inc(bool,uint256)", { args: [true, 2] });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);
      assert.equal(validationResult._kind, "success");
    });

    it("should fail a call on a nonexistant function", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", { args: [] });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Contract 'Foo' doesn't have a function nonexistant"
      );
    });

    it("should fail a call with wrong number of arguments", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "sub", { args: [] });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Function sub in contract Foo expects 1 arguments but 0 were given"
      );
    });

    it("should fail an overloaded call with wrong number of arguments", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("MyContract");

        m.call(example, "inc", { args: [] });

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Function inc in contract MyContract is overloaded, but no overload expects 0 arguments"
      );
    });
  });

  describe("deployed contract", () => {
    it("should validate a correct artifact library deploy", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const existing = m.contractAt(
          "Example",
          "0x0000000000000000000000000000000000000000",
          []
        );

        return { existing };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a deployed contract with an invalid address", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const existing = m.contractAt("Example", "0xBAD", []);

        return { existing };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "The existing contract Example has an invalid address 0xBAD"
      );
    });
  });

  describe("hardhat contract deploy", () => {
    it("should validate a correct contract deploy", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Example");

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a contract deploy on a non-existant hardhat contract", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const nonexistant = m.contract("Nonexistant");

        return { nonexistant };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Artifact with name 'Nonexistant' doesn't exist"
      );
    });
  });

  describe("hardhat library deploy", () => {
    it("should validate a correct deploy", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const example = m.library("Example");

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a library deploy on a non-existant hardhat library", async () => {
      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        const nonexistant = m.library("Nonexistant");

        return { nonexistant };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Library with name 'Nonexistant' doesn't exist"
      );
    });
  });

  describe("virtual", () => {
    it("should validate", async () => {
      const subrecipe = buildRecipe("sub", (m) => {
        const example = m.contract("Example");

        return { example };
      });

      const singleRecipe = buildModule("single", (m: IRecipeGraphBuilder) => {
        m.useRecipe(subrecipe);

        return {};
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateRecipeGraph(graph, mockServices);

      assert.equal(validationResult._kind, "success");
    });
  });
});
