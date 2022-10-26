/* eslint-disable import/no-unused-modules */
import { providers, ethers } from "ethers";
import sinon from "sinon";

import { ContractsService } from "services/ContractsService";
import { Artifact } from "types/hardhat";
import type { Providers } from "types/providers";
import type { TxSender } from "utils/tx-sender";

const txSender: TxSender = {
  async send(..._) {
    console.log("send called");
    return [0, "0xabc"];
  },
  async sendAndReplace(..._) {
    console.log("sendAndReplace called");
    return "0xabc";
  },
} as TxSender;

const providersFake: Providers = {
  signers: {
    async getDefaultSigner() {
      return {
        async sendTransaction(_) {
          return {
            hash: "",
            blockHash: "",
            blockNumber: 0,
            nonce: 0,
            gasLimit: 100,
            confirmations: 0,
            chainId: 0,
            data: "",
            from: "",
          } as unknown as ethers.providers.TransactionResponse;
        },
      };
    },
  },
  ethereumProvider: {
    async request(_) {
      return {};
    },
  },
  transactions: {
    async isConfirmed(_) {
      return false;
    },
    async isMined(_) {
      return false;
    },
  },
  gasProvider: {
    async estimateGasLimit(_) {
      return ethers.BigNumber.from(0);
    },
    async estimateGasPrice() {
      return ethers.BigNumber.from(0);
    },
  },
} as Providers;

describe.skip("ContractsService", function () {
  it("should retry an unconfirmed transaction until the retry limit is hit", async function () {
    class Web3Provider {
      public blockNumber: 0;
      public getBlockNumber = () => {
        this.blockNumber += 5;
        return this.blockNumber;
      };
      public getTransaction = () => {
        return {
          hash: "",
          blockHash: "",
          blockNumber: 0,
          nonce: 0,
          gasLimit: 100,
          confirmations: 0,
          chainId: 0,
          data: "",
          from: "",
        } as unknown as ethers.providers.TransactionResponse;
      };
    }

    class ContractFactory {
      public getDeployTransaction = () => {
        return {};
      };
    }

    sinon.stub(ethers, "providers").returns({ Web3Provider });
    sinon.stub(ethers, "ContractFactory").returns(ContractFactory);

    // @ts-ignore
    // sinon.replace(ethers.providers, "Web3Provider", Web3Provider);
    // @ts-ignore
    // sinon.replace(ethers, "ContractFactory", ContractFactory);

    const contractsService = new ContractsService(providersFake, txSender, {
      pollingInterval: 10,
    });

    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode: "0x0",
      linkReferences: {},
    };

    const tx = await contractsService.deploy(fakeArtifact, [], {});

    console.log(tx);
  });
});
