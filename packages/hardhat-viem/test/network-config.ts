import type { HardhatViemHelpers } from "../src/types.js";
import type { NetworkConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { JsonRpcServer } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { encodeFunctionData } from "viem";

import HardhatViem from "../src/index.js";

interface InitResult {
  viem: HardhatViemHelpers;
  provider: EthereumProvider;
  networkConfig: NetworkConfig;
}

describe("network config behavior", () => {
  useEphemeralFixtureProject("default-ts-project");

  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatViem],
      networks: {
        localhost: { type: "http", url: "http://127.0.0.1:0" },
      },
    });
    await hre.tasks.getTask("build").run({});
  });

  describe("in-process hardhat network", () => {
    defineNetworkConfigTests(async () => {
      const conn = await hre.network.create();
      return {
        viem: conn.viem,
        provider: conn.provider,
        networkConfig: conn.networkConfig,
      };
    });
  });

  describe("local http node", () => {
    let server: JsonRpcServer;
    let address: string;
    let port: number;

    before(async () => {
      server = await hre.network.createServer();
      ({ address, port } = await server.listen());
    });

    after(async () => {
      await server.close();
    });

    defineNetworkConfigTests(async () => {
      const conn = await hre.network.create({
        network: "localhost",
        override: { url: `http://${address}:${port}` },
      });
      return {
        viem: conn.viem,
        provider: conn.provider,
        networkConfig: conn.networkConfig,
      };
    });
  });
});

function defineNetworkConfigTests(initViem: () => Promise<InitResult>) {
  describe("gas: auto (default)", () => {
    let viem: HardhatViemHelpers;

    before(async () => {
      ({ viem } = await initViem());
    });

    it("plain transaction uses estimated gas", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: walletClient.account.address,
        value: 0n,
      });
      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
      });
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, estimate);
    });

    it("contract deployment uses estimated gas", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const { deploymentTransaction } = await viem.sendDeploymentTransaction(
        "WithoutConstructorArgs",
      );
      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        data: deploymentTransaction.input,
      });

      assert.equal(deploymentTransaction.gas, estimate);
    });

    it("contract call uses estimated gas", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();
      const contract = await viem.deployContract("WithoutConstructorArgs");

      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: contract.address,
        data: encodeFunctionData({
          abi: contract.abi,
          functionName: "setData",
          args: [50n],
        }),
      });
      const hash = await contract.write.setData([50n]);
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, estimate);
    });

    it("explicit gas overrides auto estimation", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
        gas: 500_000n,
      });
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, 500_000n);
    });
  });

  describe("gas: fixed value", () => {
    let viem: HardhatViemHelpers;
    let networkConfig: NetworkConfig;

    before(async () => {
      ({ viem, networkConfig } = await initViem());
      networkConfig.gas = 1_000_000n;
    });

    it("plain transaction uses fixed gas", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
      });
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, 1_000_000n);
    });

    it("contract deployment uses fixed gas", async () => {
      const { deploymentTransaction } = await viem.sendDeploymentTransaction(
        "WithoutConstructorArgs",
      );

      assert.equal(deploymentTransaction.gas, 1_000_000n);
    });

    it("contract call uses fixed gas", async () => {
      const publicClient = await viem.getPublicClient();
      const contract = await viem.deployContract("WithoutConstructorArgs");

      const hash = await contract.write.setData([50n]);
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, 1_000_000n);
    });

    it("explicit gas overrides fixed config", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
        gas: 500_000n,
      });
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, 500_000n);
    });
  });

  describe("gasMultiplier", () => {
    const GAS_MULTIPLIER = 1.5;
    let viem: HardhatViemHelpers;
    let networkConfig: NetworkConfig;

    before(async () => {
      ({ viem, networkConfig } = await initViem());
      networkConfig.gasMultiplier = GAS_MULTIPLIER;
    });

    it("plain transaction gas is multiplied", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: walletClient.account.address,
        value: 0n,
      });
      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
      });
      const tx = await publicClient.getTransaction({ hash });

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(tx.gas, expected);
    });

    it("contract deployment gas is multiplied", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const { deploymentTransaction } = await viem.sendDeploymentTransaction(
        "WithoutConstructorArgs",
      );
      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        data: deploymentTransaction.input,
      });

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(deploymentTransaction.gas, expected);
    });

    it("contract call gas is multiplied", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();
      const contract = await viem.deployContract("WithoutConstructorArgs");

      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: contract.address,
        data: encodeFunctionData({
          abi: contract.abi,
          functionName: "setData",
          args: [50n],
        }),
      });
      const hash = await contract.write.setData([50n]);
      const tx = await publicClient.getTransaction({ hash });

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(tx.gas, expected);
    });

    it("explicit gas is not multiplied", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: 0n,
        gas: 500_000n,
      });
      const tx = await publicClient.getTransaction({ hash });

      assert.equal(tx.gas, 500_000n);
    });
  });

  describe("gasPrice config", () => {
    describe("auto gasPrice (default)", () => {
      let viem: HardhatViemHelpers;

      before(async () => {
        ({ viem } = await initViem());
      });

      it("EIP-1559 fields are populated", async () => {
        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();

        const hash = await walletClient.sendTransaction({
          to: walletClient.account.address,
          value: 0n,
        });
        const tx = await publicClient.getTransaction({ hash });

        assert.equal(tx.type, "eip1559");
        assert.notEqual(tx.maxFeePerGas, null);
        assert.notEqual(tx.maxPriorityFeePerGas, null);
      });
    });

    describe("fixed gasPrice", () => {
      let viem: HardhatViemHelpers;
      let networkConfig: NetworkConfig;
      const FIXED_GAS_PRICE = 10_000_000_000n; // 10 gwei

      before(async () => {
        ({ viem, networkConfig } = await initViem());
        networkConfig.gasPrice = FIXED_GAS_PRICE;
      });

      it("legacy gasPrice is used", async () => {
        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();

        const hash = await walletClient.sendTransaction({
          to: walletClient.account.address,
          value: 0n,
        });
        const tx = await publicClient.getTransaction({ hash });

        assert.equal(tx.type, "legacy");
        assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
      });

      it("explicit gasPrice overrides config", async () => {
        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();
        const userGasPrice = 20_000_000_000n;

        const hash = await walletClient.sendTransaction({
          to: walletClient.account.address,
          value: 0n,
          gasPrice: userGasPrice,
        });
        const tx = await publicClient.getTransaction({ hash });

        assert.equal(tx.gasPrice, userGasPrice);
      });

      it("explicit maxFeePerGas overrides config", async () => {
        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();

        const hash = await walletClient.sendTransaction({
          to: walletClient.account.address,
          value: 0n,
          maxFeePerGas: 20_000_000_000n,
          maxPriorityFeePerGas: 1_000_000_000n,
        });
        const tx = await publicClient.getTransaction({ hash });

        assert.equal(tx.type, "eip1559");
        assert.equal(tx.maxFeePerGas, 20_000_000_000n);
        assert.equal(tx.maxPriorityFeePerGas, 1_000_000_000n);
      });
    });
  });

  describe("from config", () => {
    let viem: HardhatViemHelpers;

    before(async () => {
      ({ viem } = await initViem());
    });

    it("default wallet client sends from its own address", async () => {
      const publicClient = await viem.getPublicClient();
      const [firstClient, secondClient] = await viem.getWalletClients();
      const hash = await firstClient.sendTransaction({
        to: secondClient.account.address,
        value: 0n,
      });
      const tx = await publicClient.getTransaction({ hash });
      assert.equal(
        tx.from.toLowerCase(),
        firstClient.account.address.toLowerCase(),
      );
    });

    it("non-first wallet client sends from its own address", async () => {
      const publicClient = await viem.getPublicClient();
      const [firstClient, secondClient] = await viem.getWalletClients();
      const hash = await secondClient.sendTransaction({
        to: firstClient.account.address,
        value: 0n,
      });
      const tx = await publicClient.getTransaction({ hash });
      assert.equal(
        tx.from.toLowerCase(),
        secondClient.account.address.toLowerCase(),
      );
    });
  });

  describe("non-interference with RPC calls", () => {
    let viem: HardhatViemHelpers;
    let provider: EthereumProvider;

    before(async () => {
      let networkConfig: NetworkConfig;
      ({ viem, provider, networkConfig } = await initViem());
      networkConfig.gas = 1_000_000n;
      networkConfig.gasPrice = 10_000_000_000n;
    });

    it("estimateGas returns real estimate, not fixed config value", async () => {
      const publicClient = await viem.getPublicClient();
      const [walletClient] = await viem.getWalletClients();

      const estimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: walletClient.account.address,
        value: 0n,
      });

      assert.notEqual(estimate, 1_000_000n);
      assert.ok(estimate > 0n, "estimate should be greater than 0");
    });

    it("eth_gasPrice returns real gas price, not fixed config value", async () => {
      const gasPrice = await provider.request({
        method: "eth_gasPrice",
      });

      assert.ok(typeof gasPrice === "string", "gasPrice should be a string");
      assert.ok(BigInt(gasPrice) > 0n, "gasPrice should be greater than 0");
      assert.notEqual(BigInt(gasPrice), 10_000_000_000n);
    });
  });
}
