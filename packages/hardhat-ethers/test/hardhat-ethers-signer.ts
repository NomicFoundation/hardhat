import { assert } from "chai";

import { usePersistentEnvironment } from "./environment";
import { ExampleContract, EXAMPLE_CONTRACT } from "./example-contracts";
import { assertIsNotNull, assertWithin } from "./helpers";

describe("hardhat ethers signer", function () {
  describe("minimal project", function () {
    usePersistentEnvironment("minimal-project");

    it("has an address field that matches the address", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      assert.isString(signer.address);
      assert.strictEqual(signer.address, await signer.getAddress());
    });

    it("can be connected to a provider", async function () {
      if (
        process.env.INFURA_URL === undefined ||
        process.env.INFURA_URL === ""
      ) {
        this.skip();
      }

      const signerConnectedToHardhat = await this.env.ethers.provider.getSigner(
        0
      );

      const nonceInHardhat = await signerConnectedToHardhat.getNonce();

      const mainnetProvider = new this.env.ethers.JsonRpcProvider(
        process.env.INFURA_URL
      );

      const signerConnectedToMainnet =
        signerConnectedToHardhat.connect(mainnetProvider);

      const nonceInMainnet = await signerConnectedToMainnet.getNonce();

      assert.strictEqual(nonceInHardhat, 0);
      assert.isAbove(nonceInMainnet, 0);
    });

    it("can get the nonce of the signer", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      assert.strictEqual(await signer.getNonce(), 0);

      await signer.sendTransaction({ to: signer });
      assert.strictEqual(await signer.getNonce(), 1);
    });

    it("should populate a call/tx", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      const populatedCall = await signer.populateCall({
        to: signer,
      });

      assert.strictEqual(populatedCall.from, signer.address);

      // populateTransaction does exactly the same
      const populatedTx = await signer.populateCall({
        to: signer,
      });

      assert.strictEqual(populatedTx.from, signer.address);
    });

    describe("estimateGas", function () {
      it("should estimate gas for a value transaction", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);
        const gasEstimation = await signer.estimateGas({
          to: signer,
        });

        assert.strictEqual(Number(gasEstimation), 21_001);
      });

      it("should estimate gas for a contract call", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);
        const factory = new this.env.ethers.ContractFactory<
          [],
          ExampleContract
        >(EXAMPLE_CONTRACT.abi, EXAMPLE_CONTRACT.deploymentBytecode, signer);
        const contract = await factory.deploy();

        const gasEstimation = await signer.estimateGas({
          to: contract,
          data: "0x371303c0", // inc()
        });

        assertWithin(Number(gasEstimation), 65_000, 70_000);
      });
    });

    describe("call", function () {
      it("should make a contract call", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);
        const factory = new this.env.ethers.ContractFactory<
          [],
          ExampleContract
        >(EXAMPLE_CONTRACT.abi, EXAMPLE_CONTRACT.deploymentBytecode, signer);
        const contract = await factory.deploy();
        await contract.inc();

        const result = await signer.call({
          to: contract,
          data: "0x3fa4f245", // value()
        });

        assert.strictEqual(
          result,
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
      });
    });

    describe("sendTransaction", function () {
      it("should send a transaction", async function () {
        const sender = await this.env.ethers.provider.getSigner(0);
        const receiver = await this.env.ethers.provider.getSigner(1);

        const balanceBefore = await this.env.ethers.provider.getBalance(
          receiver
        );

        await sender.sendTransaction({
          to: receiver,
          value: this.env.ethers.parseEther("1"),
        });

        const balanceAfter = await this.env.ethers.provider.getBalance(
          receiver
        );

        const balanceDifference = balanceAfter - balanceBefore;

        assert.strictEqual(balanceDifference, 10n ** 18n);
      });
    });

    describe("signMessage", function () {
      it("should sign a message", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        const signedMessage = await signer.signMessage("hello");

        assert.strictEqual(
          signedMessage,
          "0xf16ea9a3478698f695fd1401bfe27e9e4a7e8e3da94aa72b021125e31fa899cc573c48ea3fe1d4ab61a9db10c19032026e3ed2dbccba5a178235ac27f94504311c"
        );
      });
    });

    describe("signTypedData", function () {
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

      it("should sign data", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        const signedData = await signer.signTypedData(
          {
            chainId: 31337,
          },
          types,
          data
        );

        assert.strictEqual(
          signedData,
          "0xbea20009786d1f69327eea384d6b8082f2d35b41212d1acbbd490516f0ae776748e93d4603df49033f89ce6a97afba4523d753d35e962ea431cc706642ad713f1b"
        );
      });

      it("should use the chain id", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        const signedData = await signer.signTypedData(
          {
            chainId: 10101,
          },
          types,
          data
        );

        // we get a different value from the different test because we changed the
        // chainId
        assert.strictEqual(
          signedData,
          "0x8a6a6aeca0cf03dbffd6d7b15207c0dcf5c7daa432e510b5de1ebecff8de6cd457e2eaa9fe96c11474a7344584f4b128c773153836142647c426b5f2c3eb6c701b"
        );
      });
    });

    describe("default gas limit", function () {
      it("should use the block gas limit for the in-process hardhat network", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        const tx = await signer.sendTransaction({ to: signer });

        if (!("blockGasLimit" in this.env.network.config)) {
          assert.fail("test should be run in the hardhat network");
        }

        const blockGasLimit = this.env.network.config.blockGasLimit;
        assert.strictEqual(Number(tx.gasLimit), blockGasLimit);
      });

      it("should use custom gas limit, if provided", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        const tx = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });

        assert.strictEqual(tx.gasLimit, 30_000n);
      });
    });

    describe("nonce management", function () {
      it("should send a second transaction with the right nonce if the first one wasn't mined", async function () {
        const signer = await this.env.ethers.provider.getSigner(0);

        await this.env.ethers.provider.send("evm_setAutomine", [false]);

        const tx1 = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });
        const tx2 = await signer.sendTransaction({
          to: signer,
          gasLimit: 30_000,
        });

        assert.notEqual(tx1.nonce, tx2.nonce);
        assert.strictEqual(tx2.nonce, tx1.nonce + 1);

        await this.env.ethers.provider.send("hardhat_mine", []);

        const latestBlock = await this.env.ethers.provider.getBlock("latest");

        assertIsNotNull(latestBlock);

        assert.lengthOf(latestBlock.transactions, 2);
      });
    });
  });

  describe('project with gas set to "auto"', function () {
    usePersistentEnvironment("hardhat-project-with-gas-auto");

    it("should estimate the gas of the transaction", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      const tx = await signer.sendTransaction({ to: signer });

      assert.strictEqual(tx.gasLimit, 21_001n);
    });

    it("should use custom gas limit, if provided", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      const tx = await signer.sendTransaction({
        to: signer,
        gasLimit: 30_000,
      });

      assert.strictEqual(tx.gasLimit, 30_000n);
    });
  });
});
