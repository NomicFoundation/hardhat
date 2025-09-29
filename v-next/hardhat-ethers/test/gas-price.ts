import type { HardhatEthers } from "../src/types.js";
import type { JsonRpcServer } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { initializeTestEthers, spawnTestRpcServer } from "./helpers/helpers.js";

let ethers: HardhatEthers;
let provider: EthereumProvider;

describe("gas price overrides", () => {
  describe("local http node", async () => {
    let server: JsonRpcServer;
    let port: number;
    let address: string;

    before(async () => {
      ({ server, port, address } = await spawnTestRpcServer());
    });

    after(async () => {
      await server.close();
    });

    beforeEach(async () => {
      ({ ethers, provider } = await initializeTestEthers([], {
        networks: {
          localhost: { type: "http", url: `http://${address}:${port}` },
        },
      }));
    });

    defineTests();
  });

  describe("in-process hardhat network", async () => {
    beforeEach(async () => {
      ({ ethers, provider } = await initializeTestEthers());
    });

    defineTests();
  });
});

function defineTests() {
  describe("plain transactions", () => {
    it("should use the given gas price if specified", async () => {
      const [signer] = await ethers.getSigners();

      const tx = await signer.sendTransaction({
        to: signer,
        gasPrice: ethers.parseUnits("10", "gwei"),
      });

      const receipt = await tx.wait();

      assert.equal(tx.gasPrice, 10n * 10n ** 9n);
      assert.equal(receipt?.gasPrice, 10n * 10n ** 9n);
    });

    it("should use EIP-1559 values if maxFeePerGas and maxPriorityFeePerGas are specified, maxFeePerGas = baseFeePerGas", async () => {
      const [signer] = await ethers.getSigners();

      const baseFeePerGas = ethers.parseUnits("10", "gwei");
      const maxFeePerGas = baseFeePerGas;
      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei");

      await provider.request({
        method: "hardhat_setNextBlockBaseFeePerGas",
        params: [numberToHexString(baseFeePerGas)],
      });

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      const receipt = await tx.wait();

      assert.equal(tx.maxFeePerGas, maxFeePerGas);
      assert.equal(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
      assert.equal(receipt?.gasPrice, maxFeePerGas);
    });

    it("should use EIP-1559 values if maxFeePerGas and maxPriorityFeePerGas are specified, maxFeePerGas > baseFeePerGas", async () => {
      const [signer] = await ethers.getSigners();

      const baseFeePerGas = ethers.parseUnits("5", "gwei");
      const maxFeePerGas = ethers.parseUnits("10", "gwei");
      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei");

      await provider.request({
        method: "hardhat_setNextBlockBaseFeePerGas",
        params: [numberToHexString(baseFeePerGas)],
      });

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      const receipt = await tx.wait();

      assert.equal(tx.maxFeePerGas, maxFeePerGas);
      assert.equal(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
      assert.equal(receipt?.gasPrice, baseFeePerGas + maxPriorityFeePerGas);
    });

    it("should use a default gas price if no value is specified", async () => {
      const [signer] = await ethers.getSigners();

      // we don't run any assertions here because the strategy
      // used to set the default gas prices might change; we
      // just check that the transaction is mined correctly
      const tx = await signer.sendTransaction({
        to: signer,
      });

      await tx.wait();
    });

    it("should use a default value for maxPriorityFeePerGas if maxFeePerGas is the only value specified", async () => {
      const [signer] = await ethers.getSigners();

      const baseFeePerGas = ethers.parseUnits("5", "gwei");
      const maxFeePerGas = ethers.parseUnits("10", "gwei");

      // make sure that the max fee is enough
      await provider.request({
        method: "hardhat_setNextBlockBaseFeePerGas",
        params: [numberToHexString(baseFeePerGas)],
      });

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
      });

      // we just check that the EIP-1559 values are set, because the
      // strategy to select a default priority fee might change
      assert.equal(
        tx.maxFeePerGas !== null && tx.maxFeePerGas !== undefined,
        true,
      );
      assert.equal(
        tx.maxPriorityFeePerGas !== null &&
          tx.maxPriorityFeePerGas !== undefined,
        true,
      );
    });

    it("should use a default maxFeePerGas if only maxPriorityFeePerGas is specified", async () => {
      const [signer] = await ethers.getSigners();

      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei");

      const tx = await signer.sendTransaction({
        to: signer,
        maxPriorityFeePerGas,
      });

      // we just check that the max fee is set, because the
      // strategy to select its value might change
      assert.equal(
        tx.maxFeePerGas !== null && tx.maxFeePerGas !== undefined,
        true,
      );

      assert.equal(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
    });

    it("should throw if both gasPrice and maxFeePerGas are specified", async () => {
      const [signer] = await ethers.getSigners();

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      await assert.rejects(
        signer.sendTransaction({
          to: signer,
          gasPrice: ethers.parseUnits("10", "gwei"),
          maxFeePerGas: ethers.parseUnits("10", "gwei"),
        }),
        (err: any) =>
          err.message === "Cannot send both gasPrice and maxFeePerGas params",
      );
    });

    it("should throw if both gasPrice and maxPriorityFeePerGas are specified", async () => {
      const [signer] = await ethers.getSigners();

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      await assert.rejects(
        signer.sendTransaction({
          to: signer,
          gasPrice: ethers.parseUnits("10", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
        }),
        (err: any) =>
          err.message === "Cannot send both gasPrice and maxPriorityFeePerGas",
      );
    });

    it("should throw if gasPrice, maxFeePerGas and maxPriorityFeePerGas are specified", async () => {
      const [signer] = await ethers.getSigners();

      // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
      await assert.rejects(
        signer.sendTransaction({
          to: signer,
          gasPrice: ethers.parseUnits("10", "gwei"),
          maxFeePerGas: ethers.parseUnits("10", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
        }),
        "Cannot send both gasPrice and maxFeePerGas",
      );
    });
  });
}
