import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { useEnvironment } from "./environment";

use(chaiAsPromised);

describe("gas price overrides", function () {
  describe("in-process hardhat network", function () {
    useEnvironment("hardhat-project", "hardhat");

    runTests();
  });

  describe("hardhat node", function () {
    useEnvironment("hardhat-project", "localhost");

    runTests();
  });
});

function runTests() {
  describe("plain transactions", function () {
    it("should use the given gas price if specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      const tx = await signer.sendTransaction({
        to: signer,
        gasPrice: this.env.ethers.parseUnits("10", "gwei"),
      });

      const receipt = await tx.wait();

      assert.strictEqual(tx.gasPrice, 10n * 10n ** 9n);
      assert.strictEqual(receipt?.gasPrice, 10n * 10n ** 9n);
    });

    it("should use EIP-1559 values if maxFeePerGas and maxPriorityFeePerGas are specified, maxFeePerGas = baseFeePerGas", async function () {
      const [signer] = await this.env.ethers.getSigners();

      const baseFeePerGas = this.env.ethers.parseUnits("10", "gwei");
      const maxFeePerGas = baseFeePerGas;
      const maxPriorityFeePerGas = this.env.ethers.parseUnits("1", "gwei");

      await this.env.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        [`0x${baseFeePerGas.toString(16)}`]
      );

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      const receipt = await tx.wait();

      assert.strictEqual(tx.maxFeePerGas, maxFeePerGas);
      assert.strictEqual(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
      assert.strictEqual(receipt?.gasPrice, maxFeePerGas);
    });

    it("should use EIP-1559 values if maxFeePerGas and maxPriorityFeePerGas are specified, maxFeePerGas > baseFeePerGas", async function () {
      const [signer] = await this.env.ethers.getSigners();

      const baseFeePerGas = this.env.ethers.parseUnits("5", "gwei");
      const maxFeePerGas = this.env.ethers.parseUnits("10", "gwei");
      const maxPriorityFeePerGas = this.env.ethers.parseUnits("1", "gwei");

      await this.env.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        [`0x${baseFeePerGas.toString(16)}`]
      );

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      const receipt = await tx.wait();

      assert.strictEqual(tx.maxFeePerGas, maxFeePerGas);
      assert.strictEqual(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
      assert.strictEqual(
        receipt?.gasPrice,
        baseFeePerGas + maxPriorityFeePerGas
      );
    });

    it("should use a default gas price if no value is specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      // we don't run any assertions here because the strategy
      // used to set the default gas prices might change; we
      // just check that the transaction is mined correctly
      const tx = await signer.sendTransaction({
        to: signer,
      });

      await tx.wait();
    });

    it("should use a default value for maxPriorityFeePerGas if maxFeePerGas is the only value specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      const baseFeePerGas = this.env.ethers.parseUnits("5", "gwei");
      const maxFeePerGas = this.env.ethers.parseUnits("10", "gwei");

      // make sure that the max fee is enough
      await this.env.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        [`0x${baseFeePerGas.toString(16)}`]
      );

      const tx = await signer.sendTransaction({
        to: signer,
        maxFeePerGas,
      });

      // we just check that the EIP-1559 values are set, because the
      // strategy to select a default priority fee might change
      assert.exists(tx.maxFeePerGas);
      assert.exists(tx.maxPriorityFeePerGas);
    });

    it("should use a default maxFeePerGas if only maxPriorityFeePerGas is specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      const maxPriorityFeePerGas = this.env.ethers.parseUnits("1", "gwei");

      const tx = await signer.sendTransaction({
        to: signer,
        maxPriorityFeePerGas,
      });

      // we just check that the max fee is set, because the
      // strategy to select its value might change
      assert.exists(tx.maxFeePerGas);

      assert.strictEqual(tx.maxPriorityFeePerGas, maxPriorityFeePerGas);
    });

    it("should throw if both gasPrice and maxFeePerGas are specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      await assert.isRejected(
        signer.sendTransaction({
          to: signer,
          gasPrice: this.env.ethers.parseUnits("10", "gwei"),
          maxFeePerGas: this.env.ethers.parseUnits("10", "gwei"),
        }),
        "Cannot send both gasPrice and maxFeePerGas params"
      );
    });

    it("should throw if both gasPrice and maxPriorityFeePerGas are specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      await assert.isRejected(
        signer.sendTransaction({
          to: signer,
          gasPrice: this.env.ethers.parseUnits("10", "gwei"),
          maxPriorityFeePerGas: this.env.ethers.parseUnits("10", "gwei"),
        }),
        "Cannot send both gasPrice and maxPriorityFeePerGas"
      );
    });

    it("should throw if gasPrice, maxFeePerGas and maxPriorityFeePerGas are specified", async function () {
      const [signer] = await this.env.ethers.getSigners();

      await assert.isRejected(
        signer.sendTransaction({
          to: signer,
          gasPrice: this.env.ethers.parseUnits("10", "gwei"),
          maxFeePerGas: this.env.ethers.parseUnits("10", "gwei"),
          maxPriorityFeePerGas: this.env.ethers.parseUnits("10", "gwei"),
        }),
        "Cannot send both gasPrice and maxFeePerGas"
      );
    });
  });
}
