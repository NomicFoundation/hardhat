import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { EthereumProvider } from "hardhat/types/provider";
import { HardhatEthersProvider } from "../src/internal/hardhat-ethers-provider";
import { ExampleContract, EXAMPLE_CONTRACT } from "./example-contracts";
import { usePersistentEnvironment } from "./environment";
import { assertIsNotNull, assertWithin } from "./helpers";

use(chaiAsPromised);

describe("hardhat ethers provider", function () {
  usePersistentEnvironment("minimal-project");

  it("can access itself through .provider", async function () {
    assert.strictEqual(
      this.env.ethers.provider,
      this.env.ethers.provider.provider
    );
  });

  it("should have a destroy method", async function () {
    this.env.ethers.provider.destroy();
  });

  it("should have a send method for raw JSON-RPC requests", async function () {
    const accounts = await this.env.ethers.provider.send("eth_accounts");

    assert.isArray(accounts);
  });

  describe("getSigner", function () {
    it("should get a signer using an index", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      assert.strictEqual(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );
    });

    it("should get a signer using an address", async function () {
      const signer = await this.env.ethers.provider.getSigner(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );

      assert.strictEqual(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );
    });

    it("should get a signer even if the address is all lowercase", async function () {
      const signer = await this.env.ethers.provider.getSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      );

      assert.strictEqual(
        await signer.getAddress(),
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );
    });

    it("should throw if the address checksum is wrong", async function () {
      await assert.isRejected(
        this.env.ethers.provider.getSigner(
          "0XF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266"
        ),
        "invalid address"
      );
    });

    it("should throw if the index doesn't match an account", async function () {
      await assert.isRejected(
        this.env.ethers.provider.getSigner(100),
        "Tried to get account with index 100 but there are 20 accounts"
      );
    });

    it("should work for impersonated accounts", async function () {
      const [s] = await this.env.ethers.getSigners();
      const randomAddress = "0xe7d45f52130a5634f19346a3e5d32994ad821750";

      await s.sendTransaction({
        to: randomAddress,
        value: this.env.ethers.parseEther("1"),
      });

      await this.env.ethers.provider.send("hardhat_impersonateAccount", [
        randomAddress,
      ]);

      const impersonatedSigner = await this.env.ethers.provider.getSigner(
        randomAddress
      );

      // shouldn't revert
      await impersonatedSigner.sendTransaction({
        to: s.address,
        value: this.env.ethers.parseEther("0.1"),
      });
    });
  });

  it("should return the latest block number", async function () {
    const latestBlockNumber = await this.env.ethers.provider.getBlockNumber();

    assert.strictEqual(latestBlockNumber, 0);

    await this.env.ethers.provider.send("hardhat_mine");

    assert.strictEqual(latestBlockNumber, 0);
  });

  it("should return the network", async function () {
    const network = await this.env.ethers.provider.getNetwork();

    assert.strictEqual(network.name, "hardhat");
    assert.strictEqual(network.chainId, 31337n);
  });

  describe("getFeeData", function () {
    it("should return fee data", async function () {
      const feeData = await this.env.ethers.provider.getFeeData();

      assert.typeOf(feeData.gasPrice, "bigint");
      assert.typeOf(feeData.maxFeePerGas, "bigint");
      assert.typeOf(feeData.maxPriorityFeePerGas, "bigint");
    });

    // This helper overrides the send method of an EthereumProvider to allow
    // altering the default Hardhat node's reported results.
    function overrideSendOn(
      provider: EthereumProvider,
      sendOverride: (method: string, params?: any[] | undefined) => Promise<any>
    ) {
      return new Proxy(provider, {
        get: (target: EthereumProvider, prop: keyof EthereumProvider) => {
          if (prop === "send") {
            return async (method: string, params?: any[] | undefined) => {
              const result = await sendOverride(method, params);

              return result ?? target.send(method, params);
            };
          }

          return target[prop];
        },
      });
    }

    it("should default maxPriorityFeePerGas to 1 gwei (if eth_maxPriorityFeePerGas not supported)", async function () {
      const proxiedProvider = overrideSendOn(
        this.env.network.provider,
        async (method) => {
          if (method !== "eth_maxPriorityFeePerGas") {
            // rely on default send implementation
            return undefined;
          }

          throw new Error("Method eth_maxPriorityFeePerGas is not supported");
        }
      );

      const ethersProvider = new HardhatEthersProvider(
        proxiedProvider,
        this.env.network.name
      );

      const feeData = await ethersProvider.getFeeData();

      assert.equal(feeData.maxPriorityFeePerGas, 1_000_000_000n);
    });

    it("should default maxPriorityFeePerGas to eth_maxPriorityFeePerGas if available", async function () {
      const expectedMaxPriorityFeePerGas = 4_000_000_000n;

      const overriddenEthereumProvider = overrideSendOn(
        this.env.network.provider,
        async (method) => {
          if (method !== "eth_maxPriorityFeePerGas") {
            // rely on default send implementation
            return undefined;
          }

          return expectedMaxPriorityFeePerGas.toString();
        }
      );

      const ethersProvider = new HardhatEthersProvider(
        overriddenEthereumProvider,
        this.env.network.name
      );

      const feeData = await ethersProvider.getFeeData();

      assert.equal(feeData.maxPriorityFeePerGas, 4_000_000_000n);
    });
  });

  describe("getBalance", function () {
    beforeEach(async function () {
      await this.env.network.provider.send("hardhat_reset");
    });

    it("should return the balance of an address", async function () {
      const balance = await this.env.ethers.provider.getBalance(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );

      assert.strictEqual(balance, this.env.ethers.parseEther("10000"));
    });

    it("should return the balance of a signer", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const balance = await this.env.ethers.provider.getBalance(signer);

      assert.strictEqual(balance, this.env.ethers.parseEther("10000"));
    });

    it("should accept block numbers", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const gasLimit = 21_000n;
      const gasPrice = this.env.ethers.parseUnits("100", "gwei");
      const value = this.env.ethers.parseEther("1");

      await signer.sendTransaction({
        to: this.env.ethers.ZeroAddress,
        value,
        gasLimit,
        gasPrice,
      });

      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const balanceAfter = await this.env.ethers.provider.getBalance(
        signer,
        "latest"
      );
      assert.strictEqual(
        balanceAfter,
        this.env.ethers.parseEther("10000") - gasLimit * gasPrice - value
      );

      const balanceBefore = await this.env.ethers.provider.getBalance(
        signer,
        blockNumber - 1
      );
      assert.strictEqual(balanceBefore, this.env.ethers.parseEther("10000"));
    });

    it("should accept block hashes", async function () {
      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const balance = await this.env.ethers.provider.getBalance(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        block.hash
      );

      assert.strictEqual(balance, this.env.ethers.parseEther("10000"));
    });

    it("should return the balance of a contract", async function () {
      // deploy a contract with some ETH
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy({
        value: this.env.ethers.parseEther("0.5"),
      });

      // check the balance of the contract
      const balance = await this.env.ethers.provider.getBalance(contract);

      assert.strictEqual(balance, 5n * 10n ** 17n);
    });
  });

  describe("getTransactionCount", function () {
    beforeEach(async function () {
      await this.env.network.provider.send("hardhat_reset");
    });

    it("should return the transaction count of an address", async function () {
      const balance = await this.env.ethers.provider.getTransactionCount(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );

      assert.strictEqual(balance, 0);
    });

    it("should return the transaction count of a signer", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const balance = await this.env.ethers.provider.getTransactionCount(
        signer
      );

      assert.strictEqual(balance, 0);
    });

    it("should accept block numbers", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);

      await signer.sendTransaction({
        to: this.env.ethers.ZeroAddress,
      });

      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const transactionCountAfter =
        await this.env.ethers.provider.getTransactionCount(signer, "latest");
      assert.strictEqual(transactionCountAfter, 1);

      const transactionCountBefore =
        await this.env.ethers.provider.getTransactionCount(
          signer,
          blockNumber - 1
        );
      assert.strictEqual(transactionCountBefore, 0);
    });

    it("should accept block hashes", async function () {
      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const balance = await this.env.ethers.provider.getTransactionCount(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        block.hash
      );

      assert.strictEqual(balance, 0);
    });
  });

  describe("getCode", function () {
    // deploys an empty contract
    const deploymentBytecode =
      "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea2646970667358221220eeaf807039e8b863535433564733b36afab56700620e89f192795eaf32f272ee64736f6c63430008110033";
    const contractBytecode =
      "0x6080604052600080fdfea2646970667358221220eeaf807039e8b863535433564733b36afab56700620e89f192795eaf32f272ee64736f6c63430008110033";

    let contract: ExampleContract;
    beforeEach(async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        [],
        deploymentBytecode,
        signer
      );
      contract = await factory.deploy();
    });

    it("should return the code of an address", async function () {
      const contractAddress = await contract.getAddress();

      const code = await this.env.ethers.provider.getCode(contractAddress);

      assert.strictEqual(code, contractBytecode);
    });

    it("should return the code of a contract", async function () {
      const code = await this.env.ethers.provider.getCode(contract);

      assert.strictEqual(code, contractBytecode);
    });

    it("should accept block numbers", async function () {
      const codeAfter = await this.env.ethers.provider.getCode(
        contract,
        "latest"
      );
      assert.strictEqual(codeAfter, contractBytecode);

      const blockNumber = await this.env.ethers.provider.getBlockNumber();
      const codeBefore = await this.env.ethers.provider.getCode(
        contract,
        blockNumber - 1
      );
      assert.strictEqual(codeBefore, "0x");
    });

    it("should accept block hashes", async function () {
      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const code = await this.env.ethers.provider.getCode(contract, block.hash);
      assert.strictEqual(code, contractBytecode);
    });
  });

  describe("getStorage", function () {
    let contract: ExampleContract;
    beforeEach(async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      contract = await factory.deploy();
    });

    it("should get the storage of an address", async function () {
      const contractAddress = await contract.getAddress();

      await contract.inc();

      const value = await this.env.ethers.provider.getStorage(
        contractAddress,
        0
      );
      const doubleValue = await this.env.ethers.provider.getStorage(
        contractAddress,
        1
      );

      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
    });

    it("should get the storage of a contract", async function () {
      await contract.inc();

      const value = await this.env.ethers.provider.getStorage(contract, 0);
      const doubleValue = await this.env.ethers.provider.getStorage(
        contract,
        1
      );

      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
    });

    it("should accept block numbers", async function () {
      await contract.inc();

      const storageValueAfter = await this.env.ethers.provider.getStorage(
        contract,
        0,
        "latest"
      );
      assert.strictEqual(
        storageValueAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );

      const blockNumber = await this.env.ethers.provider.getBlockNumber();
      const storageValueBefore = await this.env.ethers.provider.getStorage(
        contract,
        0,
        blockNumber - 1
      );
      assert.strictEqual(
        storageValueBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("should accept block hashes", async function () {
      await contract.inc();

      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const storageValue = await this.env.ethers.provider.getStorage(
        contract,
        0,
        block.hash
      );

      assert.strictEqual(
        storageValue,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("should accept short hex encode strings as the storage position", async function () {
      await contract.inc();

      const value = await this.env.ethers.provider.getStorage(contract, "0x0");
      const doubleValue = await this.env.ethers.provider.getStorage(
        contract,
        "0x1"
      );
      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
    });

    it("should accept long hex encode strings as the storage position", async function () {
      await contract.inc();

      const value = await this.env.ethers.provider.getStorage(
        contract,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const doubleValue = await this.env.ethers.provider.getStorage(
        contract,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
    });

    it("should accept bigints as the storage position", async function () {
      await contract.inc();

      const value = await this.env.ethers.provider.getStorage(contract, 0n);
      const doubleValue = await this.env.ethers.provider.getStorage(
        contract,
        1n
      );
      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      assert.strictEqual(
        doubleValue,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
    });
  });

  describe("estimateGas", function () {
    it("should estimate gas for a value transaction", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const gasEstimation = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: signer.address,
      });

      assert.strictEqual(Number(gasEstimation), 21_001);
    });

    it("should estimate gas for a contract call", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      const gasEstimation = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
      });

      assertWithin(Number(gasEstimation), 65_000, 70_000);
    });

    it("should accept a block number", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      await contract.inc();
      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const gasEstimationAfter = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: "latest",
      });

      assertWithin(Number(gasEstimationAfter), 30_000, 35_000);

      const gasEstimationBefore = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: blockNumber - 1,
      });

      assertWithin(Number(gasEstimationBefore), 65_000, 70_000);
    });

    it("should accept a block hash", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const gasEstimation = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
        blockTag: block.hash,
      });

      assertWithin(Number(gasEstimation), 65_000, 70_000);
    });

    it("should use the pending block by default", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      // this estimates the cost of increasing the value from 0 to 1
      const gasEstimationFirstInc = await this.env.ethers.provider.estimateGas({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x371303c0", // inc()
      });

      await this.env.ethers.provider.send("evm_setAutomine", [false]);
      await contract.inc();

      // if the pending block is used, this should estimate the cost of
      // increasing the value from 1 to 2, and this should be cheaper than
      // increasing it from 0 to 1
      const gasEstimationSecondInc = await this.env.ethers.provider.estimateGas(
        {
          from: signer.address,
          to: await contract.getAddress(),
          data: "0x371303c0", // inc()
        }
      );

      assert.isTrue(
        gasEstimationSecondInc < gasEstimationFirstInc,
        "Expected second gas estimation to be lower"
      );

      await this.env.ethers.provider.send("evm_setAutomine", [true]);
    });
  });

  describe("call", function () {
    it("should make a contract call using an address", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.inc();

      const result = await this.env.ethers.provider.call({
        from: signer.address,
        to: await contract.getAddress(),
        data: "0x3fa4f245", // value()
      });

      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("should make a contract call using a contract", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.inc();

      const result = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
      });

      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("should accept a block number", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.inc();

      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const resultAfter = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: "latest",
      });

      assert.strictEqual(
        resultAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );

      const resultBefore = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: blockNumber - 1,
      });

      assert.strictEqual(
        resultBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("should accept a block number as a bigint", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.inc();

      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const resultAfter = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: "latest",
      });

      assert.strictEqual(
        resultAfter,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );

      const resultBefore = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: BigInt(blockNumber - 1),
      });

      assert.strictEqual(
        resultBefore,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("should accept a block hash", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.inc();

      const block = await this.env.ethers.provider.getBlock("latest");

      assertIsNotNull(block);
      assertIsNotNull(block.hash);

      const result = await this.env.ethers.provider.call({
        from: signer.address,
        to: contract,
        data: "0x3fa4f245", // value()
        blockTag: block.hash,
      });

      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });
  });

  describe("broadcastTransaction", function () {
    it("should send a raw transaction", async function () {
      await this.env.ethers.provider.send("hardhat_reset");
      // private key of the first unlocked account
      const wallet = new this.env.ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        this.env.ethers.provider
      );
      const rawTx = await wallet.signTransaction({
        to: this.env.ethers.ZeroAddress,
        chainId: 31337,
        gasPrice: 100n * 10n ** 9n,
        gasLimit: 21_000,
      });

      const tx = await this.env.ethers.provider.broadcastTransaction(rawTx);

      assert.strictEqual(tx.from, wallet.address);
      assert.strictEqual(tx.to, this.env.ethers.ZeroAddress);
      assert.strictEqual(tx.gasLimit, 21_000n);
    });
  });

  describe("getBlock", function () {
    it("should accept latest and earliest block tags", async function () {
      await this.env.ethers.provider.send("hardhat_reset");
      await this.env.ethers.provider.send("hardhat_mine");
      await this.env.ethers.provider.send("hardhat_mine");
      await this.env.ethers.provider.send("hardhat_mine");

      const latestBlock = await this.env.ethers.provider.getBlock("latest");
      assertIsNotNull(latestBlock);
      assert.strictEqual(latestBlock.number, 3);

      const earliestBlock = await this.env.ethers.provider.getBlock("earliest");
      assertIsNotNull(earliestBlock);
      assert.strictEqual(earliestBlock.number, 0);
    });

    it("should accept numbers", async function () {
      await this.env.ethers.provider.send("hardhat_reset");
      await this.env.ethers.provider.send("hardhat_mine");
      await this.env.ethers.provider.send("hardhat_mine");
      await this.env.ethers.provider.send("hardhat_mine");

      const latestBlock = await this.env.ethers.provider.getBlock(3);
      assertIsNotNull(latestBlock);
      assert.strictEqual(latestBlock.number, 3);

      const earliestBlock = await this.env.ethers.provider.getBlock(1);
      assertIsNotNull(earliestBlock);
      assert.strictEqual(earliestBlock.number, 1);
    });

    it("should accept block hashes", async function () {
      await this.env.ethers.provider.send("hardhat_reset");

      const blockByNumber = await this.env.ethers.provider.getBlock(0);
      assertIsNotNull(blockByNumber);
      assertIsNotNull(blockByNumber.hash);

      const blockByHash = await this.env.ethers.provider.getBlock(
        blockByNumber.hash
      );
      assertIsNotNull(blockByHash);

      assert.strictEqual(blockByNumber.number, blockByHash.number);
      assert.strictEqual(blockByNumber.hash, blockByHash.hash);
    });

    it("shouldn't prefetch transactions by default", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await this.env.ethers.provider.getBlock("latest");
      assertIsNotNull(block);

      assert.lengthOf(block.transactions, 1);
      assert.strictEqual(block.transactions[0], tx.hash);

      assert.throws(() => block.prefetchedTransactions);
    });

    it("shouldn't prefetch transactions if false is passed", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await this.env.ethers.provider.getBlock("latest", false);
      assertIsNotNull(block);

      assert.lengthOf(block.transactions, 1);
      assert.strictEqual(block.transactions[0], tx.hash);

      assert.throws(() => block.prefetchedTransactions);
    });

    it("should prefetch transactions if true is passed", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const block = await this.env.ethers.provider.getBlock("latest", true);
      assertIsNotNull(block);

      assert.lengthOf(block.transactions, 1);
      assert.strictEqual(block.transactions[0], tx.hash);

      assert.lengthOf(block.prefetchedTransactions, 1);
      assert.strictEqual(block.prefetchedTransactions[0].hash, tx.hash);
      assert.strictEqual(block.prefetchedTransactions[0].from, signer.address);
    });
  });

  describe("getTransaction", function () {
    it("should get a transaction by its hash", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const sentTx = await signer.sendTransaction({ to: signer.address });

      const fetchedTx = await this.env.ethers.provider.getTransaction(
        sentTx.hash
      );

      assertIsNotNull(fetchedTx);
      assert.strictEqual(fetchedTx.hash, sentTx.hash);
    });

    it("should return null if the transaction doesn't exist", async function () {
      const tx = await this.env.ethers.provider.getTransaction(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      assert.isNull(tx);
    });
  });

  describe("getTransactionReceipt", function () {
    it("should get a receipt by the transaction hash", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const tx = await signer.sendTransaction({ to: signer.address });

      const receipt = await this.env.ethers.provider.getTransactionReceipt(
        tx.hash
      );

      assertIsNotNull(receipt);
      assert.strictEqual(receipt.hash, tx.hash);
      assert.strictEqual(receipt.status, 1);
    });

    it("should return null if the transaction doesn't exist", async function () {
      const receipt = await this.env.ethers.provider.getTransactionReceipt(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      assert.isNull(receipt);
    });
  });

  describe("getLogs", function () {
    // keccak("Inc()")
    const INC_EVENT_TOPIC =
      "0xccf19ee637b3555bb918b8270dfab3f2b4ec60236d1ab717296aa85d6921224f";
    // keccak("AnotherEvent()")
    const ANOTHER_EVENT_TOPIC =
      "0x601d819e31a3cd164f83f7a7cf9cb5042ab1acff87b773c68f63d059c0af2dc0";

    it("should get the logs from the latest block by default", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      await contract.inc();

      const logs = await this.env.ethers.provider.getLogs({});

      assert.lengthOf(logs, 1);

      const log = logs[0];
      assert.strictEqual(log.address, await contract.getAddress());
      assert.lengthOf(log.topics, 1);
      assert.strictEqual(log.topics[0], INC_EVENT_TOPIC);
    });

    it("should get the logs by block number", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      await contract.inc();
      await this.env.ethers.provider.send("hardhat_mine");
      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      // latest block shouldn't have logs
      const latestBlockLogs = await this.env.ethers.provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });
      assert.lengthOf(latestBlockLogs, 0);

      const logs = await this.env.ethers.provider.getLogs({
        fromBlock: blockNumber - 1,
        toBlock: blockNumber - 1,
      });

      assert.lengthOf(logs, 1);

      const log = logs[0];
      assert.strictEqual(log.address, await contract.getAddress());
      assert.lengthOf(log.topics, 1);
      assert.strictEqual(log.topics[0], INC_EVENT_TOPIC);
    });

    it("should get the logs by address", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract1 = await factory.deploy();
      const contract2 = await factory.deploy();

      await contract1.inc();
      await contract2.inc();
      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const logs = await this.env.ethers.provider.getLogs({
        fromBlock: blockNumber - 1,
        toBlock: blockNumber,
      });

      assert.lengthOf(logs, 2);

      const logsByAddress = await this.env.ethers.provider.getLogs({
        address: await contract1.getAddress(),
        fromBlock: blockNumber - 1,
        toBlock: blockNumber,
      });

      assert.lengthOf(logsByAddress, 1);
      assert.strictEqual(
        logsByAddress[0].address,
        await contract1.getAddress()
      );
    });

    it("should get the logs by an array of addresses", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract1 = await factory.deploy();
      const contract2 = await factory.deploy();
      const contract3 = await factory.deploy();

      await contract1.inc();
      await contract2.inc();
      await contract3.inc();
      const blockNumber = await this.env.ethers.provider.getBlockNumber();

      const logs = await this.env.ethers.provider.getLogs({
        fromBlock: blockNumber - 2,
        toBlock: blockNumber,
      });

      assert.lengthOf(logs, 3);

      const contract1Address = await contract1.getAddress();
      const contract2Address = await contract2.getAddress();
      const logsByAddress = await this.env.ethers.provider.getLogs({
        address: [contract1Address, contract2Address],
        fromBlock: blockNumber - 2,
        toBlock: blockNumber,
      });

      assert.lengthOf(logsByAddress, 2);
      assert.strictEqual(logsByAddress[0].address, contract1Address);
      assert.strictEqual(logsByAddress[1].address, contract2Address);
    });

    it("should get the logs by topic", async function () {
      const signer = await this.env.ethers.provider.getSigner(0);
      const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
        EXAMPLE_CONTRACT.abi,
        EXAMPLE_CONTRACT.deploymentBytecode,
        signer
      );
      const contract = await factory.deploy();

      await contract.emitsTwoEvents();

      const logs = await this.env.ethers.provider.getLogs({});
      assert.lengthOf(logs, 2);

      const incEventLogs = await this.env.ethers.provider.getLogs({
        topics: [INC_EVENT_TOPIC],
      });

      assert.lengthOf(incEventLogs, 1);
      assert.lengthOf(incEventLogs[0].topics, 1);
      assert.strictEqual(incEventLogs[0].topics[0], INC_EVENT_TOPIC);

      const anotherEventLogs = await this.env.ethers.provider.getLogs({
        topics: [ANOTHER_EVENT_TOPIC],
      });

      assert.lengthOf(anotherEventLogs, 1);
      assert.lengthOf(anotherEventLogs[0].topics, 1);
      assert.strictEqual(anotherEventLogs[0].topics[0], ANOTHER_EVENT_TOPIC);
    });
  });
});
