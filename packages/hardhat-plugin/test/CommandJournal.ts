/* eslint-disable import/no-unused-modules */
import { DeployStateExecutionCommand } from "@ignored/ignition-core";
import { assert } from "chai";
import { BigNumber } from "ethers";
import fs from "fs";

import { CommandJournal } from "../src/CommandJournal";

const tempCommandFilePath = "./tmp-test-journal.journal.ndjson";

describe("File based command journal", () => {
  afterEach(() => {
    if (fs.existsSync(tempCommandFilePath)) {
      fs.unlinkSync(tempCommandFilePath);
    }
  });

  it("should write and read commands", async () => {
    const journal = new CommandJournal(31337, tempCommandFilePath);

    const commands: DeployStateExecutionCommand[] = [
      { type: "EXECUTION::START" },
      { type: "EXECUTION::SET_BATCH", batch: [0, 1, 2, 3] },
      {
        type: "EXECUTION::SET_VERTEX_RESULT",
        vertexId: 0,
        result: {
          _kind: "success",
          result: {
            name: "Example",
            abi: [
              {
                inputs: [
                  { internalType: "uint256", name: "n", type: "uint256" },
                ],
                name: "readExample",
                outputs: [{ internalType: "string", name: "", type: "string" }],
                stateMutability: "pure",
                type: "function",
              },
            ],
            bytecode:
              "0x608060405234801561001057600080fd5b5061022f806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063820fc73b14610030575b600080fd5b61004a600480360381019061004591906100eb565b610060565b60405161005791906101a8565b60405180910390f35b606060008203610073576100726101ca565b5b6040518060400160405280600781526020017f6578616d706c65000000000000000000000000000000000000000000000000008152509050919050565b600080fd5b6000819050919050565b6100c8816100b5565b81146100d357600080fd5b50565b6000813590506100e5816100bf565b92915050565b600060208284031215610101576101006100b0565b5b600061010f848285016100d6565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610152578082015181840152602081019050610137565b60008484015250505050565b6000601f19601f8301169050919050565b600061017a82610118565b6101848185610123565b9350610194818560208601610134565b61019d8161015e565b840191505092915050565b600060208201905081810360008301526101c2818461016f565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052600160045260246000fdfea26469706673582212202d2263b386bafd8054b95874b748ed34129acf3f6521259fcc745499f85fd30064736f6c63430008110033",
            address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            value: BigNumber.from(0),
          },
        },
      },
      {
        type: "EXECUTION::SET_VERTEX_RESULT",
        vertexId: 1,
        result: {
          _kind: "success",
          result: {
            hash: "0x7058ee5c5c027de2480a3d559695d0a1311763c5dcb3d301ee1203cc44a9031d",
          },
        },
      },
      {
        type: "EXECUTION::SET_VERTEX_RESULT",
        vertexId: 2,
        result: {
          _kind: "failure",
          failure: {} as any, // new Error("Example Error"),
        },
      },
      {
        type: "EXECUTION::SET_VERTEX_RESULT",
        vertexId: 3,
        result: {
          _kind: "hold",
        },
      },
    ];

    for (const command of commands) {
      await journal.record(command);
    }

    const readCommands: DeployStateExecutionCommand[] = [];

    for await (const readCommand of journal.read()) {
      readCommands.push(readCommand);
    }

    assert.deepStrictEqual(readCommands, commands);
  });

  it("should scope runs by chainId", async () => {
    const hardhatNetworkJournal = new CommandJournal(
      31337,
      tempCommandFilePath
    );

    const commands: DeployStateExecutionCommand[] = [
      { type: "EXECUTION::START" },
    ];

    for (const command of commands) {
      await hardhatNetworkJournal.record(command);
    }

    const otherNetworkJournal = new CommandJournal(99999, tempCommandFilePath);

    const otherNetworkCommands: DeployStateExecutionCommand[] = [];

    for await (const readCommand of otherNetworkJournal.read()) {
      otherNetworkCommands.push(readCommand);
    }

    assert.deepStrictEqual(otherNetworkCommands, []);

    const laterHardhatNetworkJournal = new CommandJournal(
      31337,
      tempCommandFilePath
    );

    const laterHardhatNetworkCommands: DeployStateExecutionCommand[] = [];

    for await (const readCommand of laterHardhatNetworkJournal.read()) {
      laterHardhatNetworkCommands.push(readCommand);
    }

    assert.deepStrictEqual(laterHardhatNetworkCommands, commands);
  });
});
