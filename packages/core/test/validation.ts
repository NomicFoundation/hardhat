/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import sinon from "sinon";

import { buildModule } from "dsl/buildModule";
import { buildSubgraph } from "dsl/buildSubgraph";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type { IDeploymentBuilder } from "types/deploymentGraph";
import { ArtifactContract } from "types/future";
import { Artifact } from "types/hardhat";
import { validateDeploymentGraph } from "validation/validateDeploymentGraph";

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact);

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact contract deploy with the wrong number of args", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

    it("should not validate a artifact contract deploy with a non-BigNumber value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, 3],
          value: "42" as any,
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(error.message, "For contract 'value' must be a BigNumber");
    });

    it("should not validate a artifact contract deploy with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, m.getBytesForArtifact("Nonexistant")],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact(_name: string) {
            return false;
          },
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

  describe("artifact library deploy", () => {
    it("should validate a correct artifact library deploy", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact);

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact library deploy with the wrong number of args", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

    it("should not validate a artifact library deploy with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [1, 2, m.getBytesForArtifact("Nonexistant")],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact(_name: string) {
            return false;
          },
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "sub", { args: [2] });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );
      assert.equal(validationResult._kind, "success");
    });

    it("should validate an overriden call", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "inc(bool,uint256)", { args: [true, 2] });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );
      assert.equal(validationResult._kind, "success");
    });

    it("should fail a call on a nonexistant function", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", { args: [] });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "sub", { args: [] });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("MyContract");

        m.call(example, "inc", { args: [] });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

    it("should fail a call on a non-BigNumber as value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", { args: [], value: true as any });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(error.message, "For call 'value' must be a BigNumber");
    });

    it("should fail a call with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", {
          args: [m.getBytesForArtifact("Bar")],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const fakeHasArtifact = sinon.stub();
      fakeHasArtifact.onFirstCall().resolves(true);
      fakeHasArtifact.onSecondCall().resolves(false);

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: fakeHasArtifact,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(error.message, "Artifact with name 'Bar' doesn't exist");
    });
  });

  describe("awaited event", () => {
    const exampleEventArtifact = {
      _format: "hh-sol-artifact-1",
      contractName: "Test",
      sourceName: "contracts/Test.sol",
      abi: [
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "sender",
              type: "address",
            },
          ],
          name: "SomeEvent",
          type: "event",
        },
        {
          inputs: [],
          name: "test",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      bytecode:
        "6080604052348015600f57600080fd5b5060b08061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063f8a8fd6d14602d575b600080fd5b60336035565b005b3373ffffffffffffffffffffffffffffffffffffffff167f62e1088ac332ffa611ac64bd5a2aef2c27de42d3c61c686ec5c53753c35c7f6860405160405180910390a256fea2646970667358221220a77b6f6bba99fe90fc34a87656ffff1d3703a60de09e70feb2a64ed1dee0862264736f6c63430008070033",
      deployedBytecode:
        "6080604052348015600f57600080fd5b506004361060285760003560e01c8063f8a8fd6d14602d575b600080fd5b60336035565b005b3373ffffffffffffffffffffffffffffffffffffffff167f62e1088ac332ffa611ac64bd5a2aef2c27de42d3c61c686ec5c53753c35c7f6860405160405180910390a256fea2646970667358221220a77b6f6bba99fe90fc34a87656ffff1d3703a60de09e70feb2a64ed1dee0862264736f6c63430008070033",
      linkReferences: {},
      deployedLinkReferences: {},
    };

    it("should validate a correct awaited event", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Test", exampleEventArtifact);

        const call = m.call(example, "test", { args: [] });

        m.awaitEvent(example as ArtifactContract, "SomeEvent", {
          after: [call],
          args: ["0x0"],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );
      assert.equal(validationResult._kind, "success");
    });

    it("should fail awaiting a nonexistant event", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Test", exampleEventArtifact);

        const call = m.call(example, "test", { args: [] });

        m.awaitEvent(example as ArtifactContract, "Nonexistant", {
          args: [],
          after: [call],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Contract 'Test' doesn't have an event Nonexistant"
      );
    });

    it("should fail an awaited event with too many arguments", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Test", exampleEventArtifact);

        const call = m.call(example, "test", { args: [] });

        m.awaitEvent(example as ArtifactContract, "SomeEvent", {
          after: [call],
          args: [1, 2, 3, 4],
        });

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(
        error.message,
        "Event SomeEvent in contract Test expects 1 arguments but 4 were given"
      );
    });
  });

  describe("deployed contract", () => {
    it("should validate a correct artifact library deploy", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const existing = m.contractAt(
          "Example",
          "0x0000000000000000000000000000000000000000",
          []
        );

        return { existing };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a deployed contract with an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const existing = m.contractAt("Example", "0xBAD", []);

        return { existing };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example");

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a contract deploy on a non-existant hardhat contract", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant");

        return { nonexistant };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

    it("should not validate a contract with non-BigNumber value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant", { value: "42" as any });

        return { nonexistant };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      if (validationResult._kind !== "failure") {
        return assert.fail("validation should have failed");
      }

      const {
        failures: [text, [error]],
      } = validationResult;

      assert.equal(text, "Validation failed");
      assert.equal(error.message, "For contract 'value' must be a BigNumber");
    });

    it("should not validate a contract with non-existing bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant", {
          args: [m.getBytesForArtifact("Nonexistant")],
        });

        return { nonexistant };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example");

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a library deploy on a non-existant hardhat library", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.library("Nonexistant");

        return { nonexistant };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

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

  describe("virtual", () => {
    it("should validate", async () => {
      const subgraph = buildSubgraph("sub", (m) => {
        const example = m.contract("Example");

        return { example };
      });

      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        m.useSubgraph(subgraph);

        return {};
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await validateDeploymentGraph(
        graph,
        mockServices
      );

      assert.equal(validationResult._kind, "success");
    });
  });
});
