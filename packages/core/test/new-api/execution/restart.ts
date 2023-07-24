/* eslint-disable import/no-unused-modules */
import { defineModule } from "../../../src/new-api/define-module";
import { MemoryJournal } from "../../../src/new-api/internal/journal/memory-journal";
import { Wiper } from "../../../src/new-api/internal/wiper";
import {
  assertDeploymentFailure,
  assertDeploymentSuccess,
  exampleAccounts,
  setupDeployerWithMocks,
} from "../helpers";

describe("execution engine", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const txId = "0x123";

  describe("restart - error", () => {
    const contractWithOneArgConstructorArtifact = {
      abi: [
        {
          type: "constructor",
          stateMutability: "payable",
          inputs: [
            {
              name: "_first",
              type: "uint256",
              internalType: "uint256",
            },
          ],
        },
      ],
      contractName: "Contract1",
      bytecode: "",
      linkReferences: {},
    };

    it("should allow restart", async () => {
      const firstRunModDef = defineModule("Module1", (m) => {
        // Invalid constructor arg - causes revert
        const contract1 = m.contract("Contract1", [0]);

        return { contract1 };
      });

      const secondRunModDef = defineModule("Module1", (m) => {
        // Valid constructor arg
        const contract1 = m.contract("Contract1", [1]);

        return { contract1 };
      });

      const journal = new MemoryJournal();

      // Act - first run with revert on contract deploy

      const initialDeployer = setupDeployerWithMocks({
        journal,
        artifacts: {
          Contract1: contractWithOneArgConstructorArtifact,
        },
        sendErrors: {
          [exampleAccounts[0]]: {
            0: () => {
              const error = new Error("EVM revert");
              (error as any).reason = "EVM revert";
              throw error;
            },
          },
        },
      });

      const firstRunResult = await initialDeployer.deploy(
        firstRunModDef,
        {},
        exampleAccounts
      );

      assertDeploymentFailure(firstRunResult, {
        "Module1:Contract1": new Error("EVM revert"),
      });

      // Act - wipe the state for the failed future
      await new Wiper(journal).wipe("Module1:Contract1");

      // Act - rerun the deployment to success
      const rerunDeployer = setupDeployerWithMocks({
        journal,
        artifacts: {
          Contract1: contractWithOneArgConstructorArtifact,
        },
        transactionResponses: {
          [exampleAccounts[0]]: {
            0: {
              blockNumber: 0,
              confirmations: 1,
              contractAddress: exampleAddress,
              transactionHash: txId,
            } as any,
          },
        },
      });

      const secondRunResult = await rerunDeployer.deploy(
        secondRunModDef,
        {},
        exampleAccounts
      );

      assertDeploymentSuccess(secondRunResult, {
        "Module1:Contract1": {
          contractName: "Contract1",
          contractAddress: exampleAddress,
          artifact: contractWithOneArgConstructorArtifact,
        },
      });
    });
  });
});
