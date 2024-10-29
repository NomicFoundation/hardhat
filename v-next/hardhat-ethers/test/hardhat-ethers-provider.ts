import type { ExampleContract } from "./helpers/example-contracts.js";
import type { HardhatEthers } from "../src/types.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";
import type {
  EthereumProvider,
  RequestArguments,
} from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { HardhatEthersProvider } from "../src/internal/hardhat-ethers-provider/hardhat-ethers-provider.js";

import { EXAMPLE_CONTRACT } from "./helpers/example-contracts.js";
import {
  assertIsNotNull,
  assertWithin,
  initializeTestEthers,
} from "./helpers/helpers.js";

describe("hardhat ethers provider", () => {
  let ethers: HardhatEthers;
  let ethereumProvider: EthereumProvider;
  let networkName: string;
  let networkConfig: NetworkConfig;

  beforeEach(async () => {
    ({
      ethers,
      provider: ethereumProvider,
      networkName,
      networkConfig,
    } = await initializeTestEthers());
  });

  it("can access itself through .provider", async () => {
    assert.equal(ethers.provider, ethers.provider.provider);
  });

  it("should have a destroy method", async () => {
    ethers.provider.destroy();
  });

  it("should have a send method for raw JSON-RPC requests", async () => {
    const accounts = await ethers.provider.send("eth_accounts");

    assert.equal(Array.isArray(accounts), true);
  });

  describe("getSigner", () => {
    it("should get a signer using an index", async () => {
      const signer = await ethers.provider.getSigner(0);

      assert.equal(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );
    });

    it("should get a signer using an address", async () => {
      const signer = await ethers.provider.getSigner(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );

      assert.equal(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );
    });

    it("should get a signer even if the address is all lowercase", async () => {
      const signer = await ethers.provider.getSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      );

      assert.equal(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );
    });

    it("should throw if the address checksum is wrong", async () => {
      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      await assert.rejects(
        ethers.provider.getSigner("0XF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266"),
        (err: any) => err.shortMessage === "invalid address",
      );
    });

    it("should throw if the index doesn't match an account", async () => {
      await assertRejectsWithHardhatError(
        ethers.provider.getSigner(100),
        HardhatError.ERRORS.ETHERS.ACCOUNT_INDEX_OUT_OF_RANGE,
        {
          accountIndex: 100,
          accountsLength: 20,
        },
      );
    });

    it("should work for impersonated accounts", async () => {
      const [s] = await ethers.getSigners();
      const randomAddress = "0xe7d45f52130a5634f19346a3e5d32994ad821750";

      await s.sendTransaction({
        to: randomAddress,
        value: ethers.parseEther("1"),
      });

      await ethers.provider.send("hardhat_impersonateAccount", [randomAddress]);

      const impersonatedSigner = await ethers.provider.getSigner(randomAddress);

      // shouldn't revert
      await impersonatedSigner.sendTransaction({
        to: s.address,
        value: ethers.parseEther("0.1"),
      });
    });
  });

  it("should return the latest block number", async () => {
    const latestBlockNumber = await ethers.provider.getBlockNumber();

    assert.equal(latestBlockNumber, 0);

    await ethers.provider.send("hardhat_mine");

    assert.equal(latestBlockNumber, 0);
  });

  // TODO: enable when V3 is ready: V3 node required
  // it("should return the network", async ()=>{
  //   const network = await ethers.provider.getNetwork();

  //   assert.equal(network.name, "hardhat");
  //   assert.equal(network.chainId, 31337n);
  // });

  describe("getFeeData", () => {
    it("should return fee data", async () => {
      const feeData = await ethers.provider.getFeeData();

      assert.equal(typeof feeData.gasPrice, "bigint");
      assert.equal(typeof feeData.maxFeePerGas, "bigint");
      assert.equal(typeof feeData.maxPriorityFeePerGas, "bigint");
    });

    // This helper overrides the send method of an EthereumProvider to allow
    // altering the default Hardhat node's reported results.
    function overrideSendOn(
      provider: EthereumProvider,
      sendOverride: (requestArguments: RequestArguments) => Promise<any>,
    ) {
      return new Proxy(provider, {
        get: (target: EthereumProvider, prop: keyof EthereumProvider) => {
          if (prop === "request") {
            return async (requestArguments: RequestArguments) => {
              const result = await sendOverride(requestArguments);

              return result ?? target.request(requestArguments);
            };
          }

          return target[prop];
        },
      });
    }

    it("should default maxPriorityFeePerGas to 1 gwei (if eth_maxPriorityFeePerGas not supported)", async () => {
      const proxiedProvider = overrideSendOn(
        ethereumProvider,
        async (requestArguments: RequestArguments) => {
          if (requestArguments.method !== "eth_maxPriorityFeePerGas") {
            // rely on default send implementation
            return undefined;
          }

          throw new Error("Method eth_maxPriorityFeePerGas is not supported");
        },
      );

      const ethersProvider = new HardhatEthersProvider(
        proxiedProvider,
        networkName,
        networkConfig,
      );

      const feeData = await ethersProvider.getFeeData();

      assert.equal(feeData.maxPriorityFeePerGas, 1_000_000_000n);
    });

    it("should default maxPriorityFeePerGas to eth_maxPriorityFeePerGas if available", async () => {
      const expectedMaxPriorityFeePerGas = 4_000_000_000n;

      const overriddenEthereumProvider = overrideSendOn(
        ethereumProvider,
        async (requestArguments: RequestArguments) => {
          if (requestArguments.method !== "eth_maxPriorityFeePerGas") {
            // rely on default send implementation
            return undefined;
          }

          return expectedMaxPriorityFeePerGas.toString();
        },
      );

      const ethersProvider = new HardhatEthersProvider(
        overriddenEthereumProvider,
        networkName,
        networkConfig,
      );

      const feeData = await ethersProvider.getFeeData();

      assert.equal(feeData.maxPriorityFeePerGas, 4_000_000_000n);
    });
  });

  describe("getBalance", () => {
    beforeEach(async () => {
      await ethereumProvider.request({
        method: "hardhat_reset",
      });
    });

    it("should return the balance of an address", async () => {
      const balance = await ethers.provider.getBalance(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );

      assert.equal(balance, ethers.parseEther("10000"));
    });

    it("should return the balance of a signer", async () => {
      const signer = await ethers.provider.getSigner(0);
      const balance = await ethers.provider.getBalance(signer);

      assert.equal(balance, ethers.parseEther("10000"));
    });

    it("should accept block numbers", async () => {
      const signer = await ethers.provider.getSigner(0);
      const gasLimit = 21_000n;
      const gasPrice = ethers.parseUnits("100", "gwei");
      const value = ethers.parseEther("1");

      await signer.sendTransaction({
        to: ethers.ZeroAddress,
        value,
        gasLimit,
        gasPrice,
      });

      const blockNumber = await ethers.provider.getBlockNumber();

      const balanceAfter = await ethers.provider.getBalance(signer, "latest");
      assert.equal(
        balanceAfter,
        ethers.parseEther("10000") - gasLimit * gasPrice - value,
      );

      const balanceBefore = await ethers.provider.getBalance(
        signer,
        blockNumber - 1,
      );
      assert.equal(balanceBefore, ethers.parseEther("10000"));
    });

    it("should accept block hashes", async () => {
      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const balance = await ethers.provider.getBalance(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        block.hash,
      );

      assert.equal(balance, ethers.parseEther("10000"));
    });

    it("should return the balance of a contract", async () => {
      // deploy a contract with some ETH
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy({
        value: ethers.parseEther("0.5"),
      });

      // check the balance of the contract
      const balance = await ethers.provider.getBalance(contract);

      assert.equal(balance, 5n * 10n ** 17n);
    });
  });

  describe("getTransactionCount", () => {
    beforeEach(async () => {
      await ethereumProvider.request({
        method: "hardhat_reset",
      });
    });

    it("should return the transaction count of an address", async () => {
      const balance = await ethers.provider.getTransactionCount(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      );

      assert.equal(balance, 0);
    });

    it("should return the transaction count of a signer", async () => {
      const signer = await ethers.provider.getSigner(0);
      const balance = await ethers.provider.getTransactionCount(signer);

      assert.equal(balance, 0);
    });

    it("should accept block numbers", async () => {
      const signer = await ethers.provider.getSigner(0);

      await signer.sendTransaction({
        to: ethers.ZeroAddress,
      });

      const blockNumber = await ethers.provider.getBlockNumber();

      const transactionCountAfter = await ethers.provider.getTransactionCount(
        signer,
        "latest",
      );
      assert.equal(transactionCountAfter, 1);

      const transactionCountBefore = await ethers.provider.getTransactionCount(
        signer,
        blockNumber - 1,
      );
      assert.equal(transactionCountBefore, 0);
    });

    it("should accept block hashes", async () => {
      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const balance = await ethers.provider.getTransactionCount(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        block.hash,
      );

      assert.equal(balance, 0);
    });
  });

  describe("getCode", () => {
    // deploys an empty contract
    const deploymentBytecode =
      "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea2646970667358221220eeaf807039e8b863535433564733b36afab56700620e89f192795eaf32f272ee64736f6c63430008110033";
    const contractBytecode =
      "0x6080604052600080fdfea2646970667358221220eeaf807039e8b863535433564733b36afab56700620e89f192795eaf32f272ee64736f6c63430008110033";

    let contract: ExampleContract;
    beforeEach(async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        [],
        deploymentBytecode,
        signer,
      );
      contract = await factory.deploy();
    });

    it("should return the code of an address", async () => {
      const contractAddress = await contract.getAddress();

      const code = await ethers.provider.getCode(contractAddress);

      assert.equal(code, contractBytecode);
    });

    it("should return the code of a contract", async () => {
      const code = await ethers.provider.getCode(contract);

      assert.equal(code, contractBytecode);
    });

    it("should accept block numbers", async () => {
      const codeAfter = await ethers.provider.getCode(contract, "latest");
      assert.equal(codeAfter, contractBytecode);

      const blockNumber = await ethers.provider.getBlockNumber();
      const codeBefore = await ethers.provider.getCode(
        contract,
        blockNumber - 1,
      );
      assert.equal(codeBefore, "0x");
    });

    it("should accept block hashes", async () => {
      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const code = await ethers.provider.getCode(contract, block.hash);
      assert.equal(code, contractBytecode);
    });
  });

  describe("getStorage", () => {
    let contract: ExampleContract;
    beforeEach(async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      contract = await factory.deploy();
    });

    it("should get the storage of an address", async () => {
      const contractAddress = await contract.getAddress();

      await contract.inc();

      const value = await ethers.provider.getStorage(contractAddress, 0);
      const doubleValue = await ethers.provider.getStorage(contractAddress, 1);

      assert.equal(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      );
    });

    it("should get the storage of a contract", async () => {
      await contract.inc();

      const value = await ethers.provider.getStorage(contract, 0);
      const doubleValue = await ethers.provider.getStorage(contract, 1);

      assert.equal(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      );
    });

    it("should accept block numbers", async () => {
      await contract.inc();

      const storageValueAfter = await ethers.provider.getStorage(
        contract,
        0,
        "latest",
      );
      assert.equal(
        storageValueAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );

      const blockNumber = await ethers.provider.getBlockNumber();
      const storageValueBefore = await ethers.provider.getStorage(
        contract,
        0,
        blockNumber - 1,
      );
      assert.equal(
        storageValueBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
    });

    it("should accept block hashes", async () => {
      await contract.inc();

      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const storageValue = await ethers.provider.getStorage(
        contract,
        0,
        block.hash,
      );

      assert.equal(
        storageValue,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
    });

    it("should accept short hex encode strings as the storage position", async () => {
      await contract.inc();

      const value = await ethers.provider.getStorage(contract, "0x0");
      const doubleValue = await ethers.provider.getStorage(contract, "0x1");
      assert.equal(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      );
    });

    it("should accept long hex encode strings as the storage position", async () => {
      await contract.inc();

      const value = await ethers.provider.getStorage(
        contract,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
      const doubleValue = await ethers.provider.getStorage(
        contract,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      );
    });

    it("should accept bigints as the storage position", async () => {
      await contract.inc();

      const value = await ethers.provider.getStorage(contract, 0n);
      const doubleValue = await ethers.provider.getStorage(contract, 1n);
      assert.equal(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      );
    });
  });

  describe("estimateGas", () => {
    it("should estimate gas for a value transaction", async () => {
      const signer = await ethers.provider.getSigner(0);
      const gasEstimation = await ethers.provider.estimateGas({
        from: signer.address,
        to: signer.address,
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

      const gasEstimation = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
      });

      assertWithin(Number(gasEstimation), 65_000, 70_000);
    });

    it("should accept a block number", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      await contract.inc();
      const blockNumber = await ethers.provider.getBlockNumber();

      const gasEstimationAfter = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: "latest",
      });

      assertWithin(Number(gasEstimationAfter), 30_000, 35_000);

      const gasEstimationBefore = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: blockNumber - 1,
      });

      assertWithin(Number(gasEstimationBefore), 65_000, 70_000);
    });

    it("should accept a block hash", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const gasEstimation = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: block.hash,
      });

      assertWithin(Number(gasEstimation), 65_000, 70_000);
    });

    it("should use the pending block by default", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      // this estimates the cost of increasing the value from 0 to 1
      const gasEstimationFirstInc = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
      });

      await ethers.provider.send("evm_setAutomine", [false]);
      await contract.inc();

      // if the pending block is used, this should estimate the cost of
      // increasing the value from 1 to 2, and this should be cheaper than
      // increasing it from 0 to 1
      const gasEstimationSecondInc = await ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
      });

      assert.equal(gasEstimationSecondInc < gasEstimationFirstInc, true);

      await ethers.provider.send("evm_setAutomine", [true]);
    });
  });

  describe("call", () => {
    it("should make a contract call using an address", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();
      await contract.inc();

      const result = await ethers.provider.call({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x3fa4f245", // value()
      });

      assert.equal(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
    });

    it("should make a contract call using a contract", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();
      await contract.inc();

      const result = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
      });

      assert.equal(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
    });

    it("should accept a block number", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();
      await contract.inc();

      const blockNumber = await ethers.provider.getBlockNumber();

      const resultAfter = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: "latest",
      });

      assert.equal(
        resultAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );

      const resultBefore = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: blockNumber - 1,
      });

      assert.equal(
        resultBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
    });

    it("should accept a block number as a bigint", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();
      await contract.inc();

      const blockNumber = await ethers.provider.getBlockNumber();

      const resultAfter = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: "latest",
      });

      assert.equal(
        resultAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );

      const resultBefore = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: BigInt(blockNumber - 1),
      });

      assert.equal(
        resultBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
    });

    it("should accept a block hash", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();
      await contract.inc();

      const block = await ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const result = await ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: block.hash,
      });

      assert.equal(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
    });
  });

  describe("broadcastTransaction", () => {
    it("should send a raw transaction", async () => {
      await ethers.provider.send("hardhat_reset");
      // private key of the first unlocked account
      const wallet = new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        ethers.provider,
      );
      const rawTx = await wallet.signTransaction({
        to: ethers.ZeroAddress,
        chainId: 31337,
        gasPrice: 100n * 10n ** 9n,
        gasLimit: 21_000,
      });

      const tx = await ethers.provider.broadcastTransaction(rawTx);

      assert.equal(tx.from, wallet.address);
      assert.equal(tx.to, ethers.ZeroAddress);
      assert.equal(tx.gasLimit, 21_000n);
    });
  });

  describe("getBlock", () => {
    it("should accept latest and earliest block tags", async () => {
      await ethers.provider.send("hardhat_reset");
      await ethers.provider.send("hardhat_mine");
      await ethers.provider.send("hardhat_mine");
      await ethers.provider.send("hardhat_mine");

      const latestBlock = await ethers.provider.getBlock("latest");
      assertIsNotNull(latestBlock);
      assert.equal(latestBlock.number, 3);

      const earliestBlock = await ethers.provider.getBlock("earliest");
      assertIsNotNull(earliestBlock);
      assert.equal(earliestBlock.number, 0);
    });

    it("should accept numbers", async () => {
      await ethers.provider.send("hardhat_reset");
      await ethers.provider.send("hardhat_mine");
      await ethers.provider.send("hardhat_mine");
      await ethers.provider.send("hardhat_mine");

      const latestBlock = await ethers.provider.getBlock(3);
      assertIsNotNull(latestBlock);
      assert.equal(latestBlock.number, 3);

      const earliestBlock = await ethers.provider.getBlock(1);
      assertIsNotNull(earliestBlock);
      assert.equal(earliestBlock.number, 1);
    });

    it("should accept block hashes", async () => {
      await ethers.provider.send("hardhat_reset");

      const blockByNumber = await ethers.provider.getBlock(0);
      assertIsNotNull(blockByNumber);
      assertIsNotNull(blockByNumber.hash);

      const blockByHash = await ethers.provider.getBlock(blockByNumber.hash);
      assertIsNotNull(blockByHash);

      assert.equal(blockByNumber.number, blockByHash.number);
      assert.equal(blockByNumber.hash, blockByHash.hash);
    });

    it("shouldn't prefetch transactions by default", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await ethers.provider.getBlock("latest");
      assertIsNotNull(block);

      assert.equal(block.transactions.length, 1);
      assert.equal(block.transactions[0], tx.hash);

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      assert.throws(() => block.prefetchedTransactions);
    });

    it("shouldn't prefetch transactions if false is passed", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await ethers.provider.getBlock("latest", false);
      assertIsNotNull(block);

      assert.equal(block.transactions.length, 1);
      assert.equal(block.transactions[0], tx.hash);

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      assert.throws(() => block.prefetchedTransactions);
    });

    it("should prefetch transactions if true is passed", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await ethers.provider.getBlock("latest", true);
      assertIsNotNull(block);

      assert.equal(block.transactions.length, 1);
      assert.equal(block.transactions[0], tx.hash);

      assert.equal(block.transactions.length, 1);
      assert.equal(block.prefetchedTransactions[0].hash, tx.hash);
      assert.equal(block.prefetchedTransactions[0].from, signer.address);
    });
  });

  describe("getTransaction", () => {
    it("should get a transaction by its hash", async () => {
      const signer = await ethers.provider.getSigner(0);
      const sentTx = await signer.sendTransaction({ to: signer.address });

      const fetchedTx = await ethers.provider.getTransaction(sentTx.hash);

      assertIsNotNull(fetchedTx);
      assert.equal(fetchedTx.hash, sentTx.hash);
    });

    it("should return null if the transaction doesn't exist", async () => {
      const tx = await ethers.provider.getTransaction(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );

      assert.equal(tx === null, true);
    });
  });

  describe("getTransactionReceipt", () => {
    it("should get a receipt by the transaction hash", async () => {
      const signer = await ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      assertIsNotNull(receipt);
      assert.equal(receipt.hash, tx.hash);
      assert.equal(receipt.status, 1);
    });

    it("should return null if the transaction doesn't exist", async () => {
      const receipt = await ethers.provider.getTransactionReceipt(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );

      assert.equal(receipt === null, true);
    });
  });

  describe("getLogs", () => {
    // keccak("Inc()")
    const INC_EVENT_TOPIC =
      "0xccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f";
    // keccak("AnotherEvent()")
    const ANOTHER_EVENT_TOPIC =
      "0x601d819e31a3cd164f83f7a7cf9cb5042ab1acff87b773c68f63d059c0af2dc0";

    it("should get the logs from the latest block by default", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      await contract.inc();

      const logs = await ethers.provider.getLogs({});

      assert.equal(logs.length, 1);

      const log = logs[0];
      assert.equal(log.address, await contract.getAddress());
      assert.equal(log.topics.length, 1);
      assert.equal(log.topics[0], INC_EVENT_TOPIC);
    });

    it("should get the logs by block number", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      await contract.inc();
      await ethers.provider.send("hardhat_mine");
      const blockNumber = await ethers.provider.getBlockNumber();

      // latest block shouldn't have logs
      const latestBlockLogs = await ethers.provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });
      assert.equal(latestBlockLogs.length, 0);

      const logs = await ethers.provider.getLogs({
        fromBlock: blockNumber - 1,
        toBlock: blockNumber - 1,
      });

      assert.equal(logs.length, 1);

      const log = logs[0];
      assert.equal(log.address, await contract.getAddress());
      assert.equal(log.topics.length, 1);
      assert.equal(log.topics[0], INC_EVENT_TOPIC);
    });

    it("should get the logs by address", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract1 = await factory.deploy();
      const contract2 = await factory.deploy();

      await contract1.inc();
      await contract2.inc();
      const blockNumber = await ethers.provider.getBlockNumber();

      const logs = await ethers.provider.getLogs({
        fromBlock: blockNumber - 1,
        toBlock: blockNumber,
      });

      assert.equal(logs.length, 2);

      const logsByAddress = await ethers.provider.getLogs({
        address: await contract1.getAddress(),
        fromBlock: blockNumber - 1,
        toBlock: blockNumber,
      });

      assert.equal(logsByAddress.length, 1);
      assert.equal(logsByAddress[0].address, await contract1.getAddress());
    });

    it("should get the logs by an array of addresses", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract1 = await factory.deploy();
      const contract2 = await factory.deploy();
      const contract3 = await factory.deploy();

      await contract1.inc();
      await contract2.inc();
      await contract3.inc();
      const blockNumber = await ethers.provider.getBlockNumber();

      const logs = await ethers.provider.getLogs({
        fromBlock: blockNumber - 2,
        toBlock: blockNumber,
      });

      assert.equal(logs.length, 3);

      const contract1Address = await contract1.getAddress();
      const contract2Address = await contract2.getAddress();
      const logsByAddress = await ethers.provider.getLogs({
        address: [contract1Address, contract2Address],
        fromBlock: blockNumber - 2,
        toBlock: blockNumber,
      });

      assert.equal(logsByAddress.length, 2);
      assert.equal(logsByAddress[0].address, contract1Address);
      assert.equal(logsByAddress[1].address, contract2Address);
    });

    it("should get the logs by topic", async () => {
      const signer = await ethers.provider.getSigner(0);
      const factory = new ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer,
      );
      const contract = await factory.deploy();

      await contract.emitsTwoEvents();

      const logs = await ethers.provider.getLogs({});
      assert.equal(logs.length, 2);

      const incEventLogs = await ethers.provider.getLogs({
        topics: [INC_EVENT_TOPIC],
      });

      assert.equal(incEventLogs.length, 1);
      assert.equal(incEventLogs[0].topics.length, 1);
      assert.equal(incEventLogs[0].topics[0], INC_EVENT_TOPIC);

      const anotherEventLogs = await ethers.provider.getLogs({
        topics: [ANOTHER_EVENT_TOPIC],
      });

      assert.equal(anotherEventLogs.length, 1);
      assert.equal(anotherEventLogs[0].topics.length, 1);
      assert.equal(anotherEventLogs[0].topics[0], ANOTHER_EVENT_TOPIC);
    });
  });
});
