/* eslint-disable import/no-unused-modules */
import type { IDeploymentBuilder } from "../src/types/deploymentGraph";

import { assert } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";

import { buildModule } from "../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../src/process/generateDeploymentGraphFrom";
import { ArtifactContract } from "../src/types/future";
import { Artifact } from "../src/types/hardhat";
import { Module, ModuleDict } from "../src/types/module";
import { Services } from "../src/types/services";
import { ValidationVisitResult } from "../src/types/validation";
import { IgnitionValidationError } from "../src/utils/errors";
import { validateDeploymentGraph } from "../src/validation/validateDeploymentGraph";

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

      const validationResult = await runValidation(singleModule);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact contract deploy with the wrong number of args", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
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

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
        "For contract 'value' must be a BigNumber"
      );
    });

    it("should not validate a artifact contract deploy with a non-address `from`", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, 3],
          value: ethers.utils.parseUnits("42"),
          from: 1 as any,
        });

        return { example };
      });

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
        "For contract 'from' must be a valid address string"
      );
    });

    it("should not validate a artifact contract deploy with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", exampleArtifact, {
          args: [1, 2, m.getBytesForArtifact("Nonexistant")],
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact(_name: string) {
            return false;
          },
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
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

      const validationResult = await runValidation(singleModule);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a artifact library deploy with the wrong number of args", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [1, 2, 3],
        });

        return { example };
      });

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
        "The constructor of the library 'Example' expects 0 arguments but 3 were given"
      );
    });

    it("should not validate a artifact library deploy with a non-address `from`", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [],
          from: 1 as any,
        });

        return { example };
      });

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
        "For library 'from' must be a valid address string"
      );
    });

    it("should not validate a artifact library deploy with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", exampleArtifact, {
          args: [1, 2, m.getBytesForArtifact("Nonexistant")],
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact(_name: string) {
            return false;
          },
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
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

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should validate an overriden call", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "inc(bool,uint256)", { args: [true, 2] });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should fail a call on a nonexistant function", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", { args: [] });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Contract 'Foo' doesn't have a function nonexistant"
      );
    });

    it("should fail a call with wrong number of arguments", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "sub", { args: [] });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Function sub in contract Foo expects 1 arguments but 0 were given"
      );
    });

    it("should fail an overloaded call with wrong number of arguments", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("MyContract");

        m.call(example, "inc", { args: [] });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Function inc in contract MyContract is overloaded, but no overload expects 0 arguments"
      );
    });

    it("should fail a call on a non-BigNumber as value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", { args: [], value: true as any });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For call 'value' must be a BigNumber"
      );
    });

    it("should fail a call sent from an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", {
          args: [],
          value: ethers.utils.parseUnits("42"),
          from: 1 as any,
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For call 'from' must be a valid address string"
      );
    });

    it("should fail a call with a non-existent bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.call(example, "nonexistant", {
          args: [m.getBytesForArtifact("Bar")],
        });

        return { example };
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

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Artifact with name 'Bar' doesn't exist"
      );
    });
  });

  describe("sendETH", () => {
    const exampleCallArtifact = {
      _format: "hh-sol-artifact-1",
      contractName: "Foo",
      sourceName: "contracts/Foo.sol",
      abi: [
        {
          stateMutability: "payable",
          type: "receive",
        },
      ],
      bytecode:
        "6080604052348015600f57600080fd5b50604580601d6000396000f3fe608060405236600a57005b600080fdfea2646970667358221220da7e5683d44d4d83925bddf4a1eb18237892d4fe13551888fef8b0925eb9023664736f6c63430008070033",
      deployedBytecode: "0x0",
      linkReferences: {},
      deployedLinkReferences: {},
    };

    it("should validate a correct send", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");
        const value = ethers.utils.parseUnits("42");

        m.sendETH(example, { value });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should fail a send with an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");
        const value = ethers.utils.parseUnits("42");

        m.sendETH("0xnull", { value });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        `"0xnull" is not a valid address`
      );
    });

    it("should fail a call on a non-BigNumber as value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.sendETH(example, { value: true as any });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For send 'value' must be a BigNumber"
      );
    });

    it("should fail a send from an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Foo");

        m.sendETH(example, {
          value: ethers.utils.parseUnits("42"),
          from: 1 as any,
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleCallArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For send 'from' must be a valid address string"
      );
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

        m.event(example as ArtifactContract, "SomeEvent", {
          after: [call],
          args: ["0x0"],
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should fail awaiting a nonexistant event", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Test", exampleEventArtifact);

        const call = m.call(example, "test", { args: [] });

        m.event(example as ArtifactContract, "Nonexistant", {
          args: [],
          after: [call],
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Contract 'Test' doesn't have an event Nonexistant"
      );
    });

    it("should fail an awaited event with too many arguments", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Test", exampleEventArtifact);

        const call = m.call(example, "test", { args: [] });

        m.event(example as ArtifactContract, "SomeEvent", {
          after: [call],
          args: [1, 2, 3, 4],
        });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleEventArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
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

      const validationResult = await runValidation(singleModule);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a deployed contract with an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const existing = m.contractAt("Example", "0xBAD", []);

        return { existing };
      });

      const validationResult = await runValidation(singleModule);

      assertValidationError(
        validationResult,
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

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a contract deploy on a non-existant hardhat contract", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant");

        return { nonexistant };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Contract with name 'Nonexistant' doesn't exist"
      );
    });

    it("should not validate a contract with non-BigNumber value", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant", { value: "42" as any });

        return { nonexistant };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For contract 'value' must be a BigNumber"
      );
    });

    it("should not validate a contract deployed from an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant", { from: 1 as any });

        return { nonexistant };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For contract 'from' must be a valid address string"
      );
    });

    it("should not validate a contract with non-existing bytes artifact arg", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.contract("Nonexistant", {
          args: [m.getBytesForArtifact("Nonexistant")],
        });

        return { nonexistant };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
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

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });

    it("should not validate a library deploy on a non-existant hardhat library", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const nonexistant = m.library("Nonexistant");

        return { nonexistant };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => false,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "Library with name 'Nonexistant' doesn't exist"
      );
    });

    it("should not validate a library deployed with the wrong number of args", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", { args: [1, 2] });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "The constructor of the library 'Example' expects 0 arguments but 2 were given"
      );
    });

    it("should not validate a library deployed from an invalid address", async () => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.library("Example", { args: [], from: 1 as any });

        return { example };
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assertValidationError(
        validationResult,
        "For library 'from' must be a valid address string"
      );
    });
  });

  describe("virtual", () => {
    it("should validate", async () => {
      const submodule = buildModule("sub", (m) => {
        const example = m.contract("Example");

        return { example };
      });

      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        m.useModule(submodule);

        return {};
      });

      const mockServices = {
        ...getMockServices(),
        artifacts: {
          hasArtifact: () => true,
          getArtifact: () => exampleArtifact,
        },
      } as any;

      const validationResult = await runValidation(singleModule, mockServices);

      assert.equal(validationResult._kind, "success");
    });
  });
});

async function runValidation<T extends ModuleDict>(
  ignitionModule: Module<T>,
  givenMockServices?: Services | undefined
) {
  const mockServices: Services =
    givenMockServices ??
    ({
      ...getMockServices(),
    } as any);

  const { graph, callPoints } = generateDeploymentGraphFrom(ignitionModule, {
    chainId: 31337,
    accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  });

  const validationResult = await validateDeploymentGraph(
    graph,
    callPoints,
    mockServices
  );

  return validationResult;
}

function assertValidationError(
  validationResult: ValidationVisitResult,
  expectedMessage: string
) {
  if (validationResult._kind !== "failure") {
    return assert.fail("validation should have failed");
  }

  const {
    failures: [text, [error]],
  } = validationResult;

  assert.equal(text, "Validation failed");
  assert.equal(error.message, expectedMessage);
  assert.isTrue(error instanceof IgnitionValidationError);
}
