import type { HardhatEthers } from "../src/types.js";
import type { NetworkConfig } from "hardhat/types/config";
import type { JsonRpcServer } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { initializeTestEthers, spawnTestRpcServer } from "./helpers/helpers.js";

const ARTIFACTS = [{ artifactName: "Example", fileName: "gas-config" }];

interface InitResult {
  ethers: HardhatEthers;
  provider: EthereumProvider;
  networkConfig: NetworkConfig;
}

describe("network config behavior", () => {
  describe("in-process hardhat network", () => {
    defineNetworkConfigTests(() => initializeTestEthers(ARTIFACTS));
  });

  describe("local http node", () => {
    let server: JsonRpcServer;
    let port: number;
    let address: string;

    before(async () => {
      ({ server, port, address } = await spawnTestRpcServer());
    });

    after(async () => {
      await server.close();
    });

    defineNetworkConfigTests(() =>
      initializeTestEthers(ARTIFACTS, {
        networks: {
          localhost: { type: "http", url: `http://${address}:${port}` },
        },
      }),
    );
  });
});

function defineNetworkConfigTests(initEthers: () => Promise<InitResult>) {
  describe("gas: auto (default)", () => {
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers } = await initEthers());
    });

    it("plain transaction uses estimated gas", async () => {
      const [signer] = await ethers.getSigners();
      const estimate = await signer.estimateGas({ to: signer });
      const tx = await signer.sendTransaction({ to: signer });

      assert.equal(tx.gasLimit, estimate);
    });

    it("contract deployment uses estimated gas", async () => {
      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("Example");
      const deployTx = await factory.getDeployTransaction();
      const estimate = await signer.estimateGas(deployTx);

      const example = await ethers.deployContract("Example");
      const deploymentTx = example.deploymentTransaction();

      assert.equal(deploymentTx?.gasLimit, estimate);
    });

    it("contract call uses estimated gas", async () => {
      const [signer] = await ethers.getSigners();
      const example = await ethers.deployContract("Example");
      const estimate = await signer.estimateGas({
        to: example,
        data: example.interface.encodeFunctionData("f"),
      });
      const tx = await example.f();

      assert.equal(tx.gasLimit, estimate);
    });

    it("explicit gasLimit overrides auto estimation", async () => {
      const [signer] = await ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: signer,
        gasLimit: 500_000,
      });

      assert.equal(tx.gasLimit, 500_000n);
    });
  });

  describe("gas: fixed value", () => {
    let ethers: HardhatEthers;
    let networkConfig: NetworkConfig;

    before(async () => {
      ({ ethers, networkConfig } = await initEthers());
      networkConfig.gas = 1_000_000n;
    });

    it("plain transaction uses fixed gas", async () => {
      const [signer] = await ethers.getSigners();
      const tx = await signer.sendTransaction({ to: signer });

      assert.equal(tx.gasLimit, 1_000_000n);
    });

    it("contract deployment uses fixed gas", async () => {
      const example = await ethers.deployContract("Example");
      const deploymentTx = example.deploymentTransaction();

      assert.equal(deploymentTx?.gasLimit, 1_000_000n);
    });

    it("contract call uses fixed gas", async () => {
      const example = await ethers.deployContract("Example");
      const tx = await example.f();

      assert.equal(tx.gasLimit, 1_000_000n);
    });

    it("explicit gasLimit overrides fixed config", async () => {
      const [signer] = await ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: signer,
        gasLimit: 500_000,
      });

      assert.equal(tx.gasLimit, 500_000n);
    });
  });

  describe("gasMultiplier", () => {
    const GAS_MULTIPLIER = 1.5;
    let ethers: HardhatEthers;
    let networkConfig: NetworkConfig;

    before(async () => {
      ({ ethers, networkConfig } = await initEthers());
      networkConfig.gasMultiplier = GAS_MULTIPLIER;
    });

    it("plain transaction gas is multiplied", async () => {
      const [signer] = await ethers.getSigners();
      const estimate = await signer.estimateGas({ to: signer });
      const tx = await signer.sendTransaction({ to: signer });

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(tx.gasLimit, expected);
    });

    it("contract deployment gas is multiplied", async () => {
      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("Example");
      const deployTx = await factory.getDeployTransaction();
      const estimate = await signer.estimateGas(deployTx);

      const example = await ethers.deployContract("Example");
      const deploymentTx = example.deploymentTransaction();

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(deploymentTx?.gasLimit, expected);
    });

    it("contract call gas is multiplied", async () => {
      const [signer] = await ethers.getSigners();
      const example = await ethers.deployContract("Example");
      const estimate = await signer.estimateGas({
        to: example,
        data: example.interface.encodeFunctionData("f"),
      });
      const tx = await example.f();

      const expected = BigInt(Math.floor(Number(estimate) * GAS_MULTIPLIER));
      assert.equal(tx.gasLimit, expected);
    });

    it("explicit gasLimit is not multiplied", async () => {
      const [signer] = await ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: signer,
        gasLimit: 500_000,
      });

      assert.equal(tx.gasLimit, 500_000n);
    });
  });

  describe("gasPrice config", () => {
    describe("auto gasPrice (default)", () => {
      let ethers: HardhatEthers;

      before(async () => {
        ({ ethers } = await initEthers());
      });

      it("EIP-1559 fields are populated", async () => {
        const [signer] = await ethers.getSigners();
        const tx = await signer.sendTransaction({ to: signer });

        assert.equal(tx.type, 2);
        assert.notEqual(tx.maxFeePerGas, null);
        assert.notEqual(tx.maxPriorityFeePerGas, null);
      });
    });

    describe("fixed gasPrice", () => {
      let ethers: HardhatEthers;
      let networkConfig: NetworkConfig;
      const FIXED_GAS_PRICE = 10_000_000_000n; // 10 gwei

      before(async () => {
        ({ ethers, networkConfig } = await initEthers());
        networkConfig.gasPrice = FIXED_GAS_PRICE;
      });

      it("legacy gasPrice is used", async () => {
        const [signer] = await ethers.getSigners();
        const tx = await signer.sendTransaction({ to: signer });

        assert.equal(tx.type, 0);
        assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
      });

      it("explicit gasPrice overrides config", async () => {
        const [signer] = await ethers.getSigners();
        const userGasPrice = 20_000_000_000n;
        const tx = await signer.sendTransaction({
          to: signer,
          gasPrice: userGasPrice,
        });

        assert.equal(tx.gasPrice, userGasPrice);
      });

      it("explicit maxFeePerGas overrides config", async () => {
        const [signer] = await ethers.getSigners();
        const tx = await signer.sendTransaction({
          to: signer,
          maxFeePerGas: 20_000_000_000n,
          maxPriorityFeePerGas: 1_000_000_000n,
        });

        assert.equal(tx.type, 2);
        assert.equal(tx.maxFeePerGas, 20_000_000_000n);
        assert.equal(tx.maxPriorityFeePerGas, 1_000_000_000n);
      });
    });
  });

  describe("from config", () => {
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers } = await initEthers());
    });

    it("default signer sends from its own address", async () => {
      const [firstSigner, secondSigner] = await ethers.getSigners();
      const tx = await firstSigner.sendTransaction({ to: secondSigner });
      assert.equal(tx.from, firstSigner.address);
    });

    it("non-first signer sends from its own address", async () => {
      const [firstSigner, secondSigner] = await ethers.getSigners();
      const tx = await secondSigner.sendTransaction({ to: firstSigner });
      assert.equal(tx.from, secondSigner.address);
    });

    it("respects explicit from matching the signer", async () => {
      const [firstSigner, secondSigner] = await ethers.getSigners();
      const tx = await firstSigner.sendTransaction({
        to: secondSigner,
        from: firstSigner.address,
      });
      assert.equal(tx.from, firstSigner.address);
    });

    it("throws when explicit from doesn't match the signer", async () => {
      const [firstSigner, secondSigner] = await ethers.getSigners();

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      await assert.rejects(
        firstSigner.sendTransaction({
          to: firstSigner,
          from: secondSigner.address,
        }),
        /from address mismatch/,
      );
    });
  });

  describe("non-interference with explicit gas-related calls", () => {
    let ethers: HardhatEthers;
    let provider: EthereumProvider;

    before(async () => {
      let networkConfig: NetworkConfig;
      ({ ethers, provider, networkConfig } = await initEthers());
      networkConfig.gas = 1_000_000n;
      networkConfig.gasPrice = 10_000_000_000n;
    });

    it("estimateGas returns real estimate, not fixed config value", async () => {
      const [signer] = await ethers.getSigners();
      const estimate = await signer.estimateGas({ to: signer });

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
