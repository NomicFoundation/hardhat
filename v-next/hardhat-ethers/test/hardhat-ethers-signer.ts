import type { ExampleContract } from "./helpers/example-contracts.js";
import type { HardhatEthers } from "../src/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { EXAMPLE_CONTRACT } from "./helpers/example-contracts.js";
import {
  assertIsNotNull,
  assertWithin,
  initializeTestEthers,
} from "./helpers/helpers.js";

const INFURA_URL = process.env.INFURA_URL;

describe("hardhat ethers signer", () => {
  let ethers: HardhatEthers;

  beforeEach(async () => {
    ({ ethers } = await initializeTestEthers());
  });

  describe("minimal project", () => {
    it("has an address field that matches the address", async () => {
      const signer = await ethers.provider.getSigner(0);

      assert.equal(typeof signer.address, "string");
      assert.equal(signer.address, await signer.getAddress());
    });

    it("can be connected to a provider", async function (t) {
      if (INFURA_URL === undefined || process.env.INFURA_URL === "") {
        t.skip("INFURA_URL environment variable is not set");
        return;
      }

      const signerConnectedToHardhat = await ethers.provider.getSigner(0);

      const nonceInHardhat = await signerConnectedToHardhat.getNonce();

      const mainnetProvider = new ethers.JsonRpcProvider(
        process.env.INFURA_URL,
      );

      const signerConnectedToMainnet =
        signerConnectedToHardhat.connect(mainnetProvider);

      const nonceInMainnet = await signerConnectedToMainnet.getNonce();

      assert.equal(nonceInHardhat, 0);
      assert.equal(nonceInMainnet > 0, true);
    });

    it("can get the nonce of the signer", async () => {
      const signer = await ethers.provider.getSigner(0);

      assert.equal(await signer.getNonce(), 0);

      await signer.sendTransaction({ to: signer });
      assert.equal(await signer.getNonce(), 1);
    });

    it("should populate a call/tx", async () => {
      const signer = await ethers.provider.getSigner(0);

      const populatedCall = await signer.populateCall({
        to: signer,
      });

      assert.equal(populatedCall.from, signer.address);

      // populateTransaction does exactly the same
      const populatedTx = await signer.populateCall({
        to: signer,
      });

      assert.equal(populatedTx.from, signer.address);
    });

    describe("estimateGas", () => {
      it("should estimate gas for a value transaction", async () => {
        const signer = await ethers.provider.getSigner(0);
        const gasEstimation = await signer.estimateGas({
          to: signer,
        });

        assert.equal(Number(gasEstimation), 21_001);
      });

      it("should estimate gas for a contract call", async () => {
        const signer = await ethers.provider.getSigner(0);
        const factory = new ethers.ContractFactory<[], ExampleContract>(
          EXAMPLE_CONTRACT.abi,
          EXAMPLE_CONTRACT.deploymentBytecode,
          signer,
        );
        const contract = await factory.deploy();

        const gasEstimation = await signer.estimateGas({
          to: contract,
          data: "0x371303c0", // inc()
        });

        assertWithin(Number(gasEstimation), 65_000, 70_000);
      });
    });

    describe("call", () => {
      it("should make a contract call", async () => {
        const signer = await ethers.provider.getSigner(0);
        const factory = new ethers.ContractFactory<[], ExampleContract>(
          EXAMPLE_CONTRACT.abi,
          EXAMPLE_CONTRACT.deploymentBytecode,
          signer,
        );
        const contract = await factory.deploy();
        await contract.inc();
        const result = await signer.call({
          to: contract,
          data: "0x3fa4f245", // value()
        });
        assert.equal(
          result,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        );
      });
    });

    describe("sendTransaction", () => {
      it("should send a transaction", async () => {
        const sender = await ethers.provider.getSigner(0);
        const receiver = await ethers.provider.getSigner(1);
        const balanceBefore = await ethers.provider.getBalance(receiver);
        await sender.sendTransaction({
          to: receiver,
          value: ethers.parseEther("1"),
        });
        const balanceAfter = await ethers.provider.getBalance(receiver);
        const balanceDifference = balanceAfter - balanceBefore;
        assert.equal(balanceDifference, 10n ** 18n);
      });
    });

    describe("signMessage", () => {
      it("should sign a message", async () => {
        const signer = await ethers.provider.getSigner(0);
        const signedMessage = await signer.signMessage("hello");
        assert.equal(
          signedMessage,
          "0xf16ea9a3478698f695fd1401bfe27e9e4a7e8e3da94aa72b021125e31fa899cc573c48ea3fe1d4ab61a9db10c19032026e3ed2dbccba5a178235ac27f94504311c",
        );
      });
    });

    describe("signTypedData", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const data = {
        from: {
          name: "John",
          wallet: "0x0000000000000000000000000000000000000001",
        },
        to: {
          name: "Mark",
          wallet: "0x0000000000000000000000000000000000000002",
        },
        contents: "something",
      };
      it("should sign data", async () => {
        const signer = await ethers.provider.getSigner(0);
        const signedData = await signer.signTypedData(
          {
            chainId: 31337,
          },
          types,
          data,
        );
        assert.equal(
          signedData,
          "0xbea20009786d1f69327eea384d6b8082f2d35b41212d1acbbd490516f0ae776748e93d4603df49033f89ce6a97afba4523d753d35e962ea431cc706642ad713f1b",
        );
      });
      it("should use the chain id", async () => {
        const signer = await ethers.provider.getSigner(0);
        const signedData = await signer.signTypedData(
          {
            chainId: 10101,
          },
          types,
          data,
        );
        // we get a different value from the different test because we changed the
        // chainId
        assert.equal(
          signedData,
          "0x8a6a6aeca0cf03dbffd6d7b15207c0dcf5c7daa432e510b5de1ebecff8de6cd457e2eaa9fe96c11474a7344584f4b128c773153836142647c426b5f2c3eb6c701b",
        );
      });
    });

    describe("default gas limit", () => {
      // TODO: enable when V3 is ready: when blockGasLimit is implemented
      // it("should use the block gas limit for the in-process hardhat network", async ()=>{
      //   const signer = await ethers.provider.getSigner(0);
      //   const tx = await signer.sendTransaction({ to: signer });

      //   if (!("blockGasLimit" in networkConfig)) {
      //     assert.fail("test should be run in the hardhat network");
      //   }

      //   const blockGasLimit = networkConfig.blockGasLimit;

      //   assert.equal(Number(tx.gasLimit), blockGasLimit);
      // });

      it("should use custom gas limit, if provided", async () => {
        const signer = await ethers.provider.getSigner(0);
        const tx = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });

        assert.equal(tx.gasLimit, 30_000n);
      });
    });

    describe("nonce management", () => {
      it("should send a second transaction with the right nonce if the first one wasn't mined", async () => {
        const signer = await ethers.provider.getSigner(0);

        await ethers.provider.send("evm_setAutomine", [false]);
        const tx1 = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });

        const tx2 = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });

        assert.notEqual(tx1.nonce, tx2.nonce);
        assert.equal(tx2.nonce, tx1.nonce + 1);

        await ethers.provider.send("hardhat_mine", []);

        const latestBlock = await ethers.provider.getBlock("latest");

        assertIsNotNull(latestBlock);
        assert.equal(latestBlock.transactions.length, 2);
      });
    });
  });

  describe('project with gas set to "auto"', () => {
    it("should estimate the gas of the transaction", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer });

      assert.equal(tx.gasLimit, 21_001n);
    });

    it("should use custom gas limit, if provided", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({
        to: signer,
        gasLimit: 30_000,
      });

      assert.equal(tx.gasLimit, 30_000n);
    });
  });
});
