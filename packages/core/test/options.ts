/* eslint-disable import/no-unused-modules */

import { assert } from "chai";
import { BigNumber, ethers } from "ethers";

import { buildModule, Ignition } from "../src";
import {
  DeploymentResult,
  DeploymentResultState,
} from "../src/internal/types/deployment";
import { ArtifactOld } from "../src/types/hardhat";

import { getMockServices } from "./helpers";
import { setupIgnitionWith } from "./helpers/setupIgnitionWith";

describe("deploy options", () => {
  const tokenArtifact: ArtifactOld = {
    contractName: "Token",
    abi: [
      {
        name: "ConfigComplete",
        type: "event",
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "name",
            type: "address",
          },
        ],
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "supply",
            type: "uint256",
          },
        ],
        name: "configure",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    bytecode: "0x0000000001",
    linkReferences: {},
  };

  let ignition: Ignition;
  let capturedTxOptions: any = null;

  before(async function () {
    const services = getMockServices();

    ignition = setupIgnitionWith({
      services: {
        ...services,
        accounts: {
          ...services.accounts,
          getAccounts: async () => {
            return ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"];
          },
          getSigner: async (_address: string) => {
            return new ethers.VoidSigner(_address);
          },
        },
        artifacts: {
          hasArtifact: async () => true,
          getArtifact: async () => tokenArtifact,
          getAllArtifacts: async () => [tokenArtifact],
        },
        transactions: {
          ...services.transactions,
          wait: async () => ({
            blockHash: "",
            blockNumber: 0,
            confirmations: 0,
            from: "",
            byzantium: true,
            contractAddress: "",
            cumulativeGasUsed: BigNumber.from(0),
            effectiveGasPrice: BigNumber.from(0),
            gasUsed: BigNumber.from(0),
            logs: [],
            logsBloom: "",
            to: "",
            transactionHash: "",
            transactionIndex: 0,
            type: 0,
          }),
        },
        contracts: {
          ...services.contracts,
          sendTx: async (_tran, txOptions) => {
            capturedTxOptions = txOptions;
            return "0xb75381e904154b34814d387c29e1927449edd98d30f5e310f25e9b1f19b0b077";
          },
        },
      },
    });

    const module = buildModule("Example", (m) => {
      m.contract("Token");

      return {};
    });

    const result = (await ignition.deploy(module, {
      maxRetries: 1,
      gasPriceIncrementPerRetry: BigNumber.from(1000),
      pollingInterval: 4,
      eventDuration: 10000,
      networkName: "test-network",
      force: false,
      txPollingInterval: 4,
    })) as DeploymentResult;

    assert.equal(result._kind, DeploymentResultState.SUCCESS);
  });

  it("should pass the options through to the transaction service", async function () {
    assert.equal(capturedTxOptions.maxRetries, 1);
    assert(BigNumber.isBigNumber(capturedTxOptions.gasPriceIncrementPerRetry));
    assert(
      BigNumber.from(capturedTxOptions.gasPriceIncrementPerRetry).eq(1000)
    );
    assert.equal(capturedTxOptions.pollingInterval, 4);
    assert.equal(capturedTxOptions.eventDuration, 10000);
  });
});
