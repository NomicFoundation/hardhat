import assert from "node:assert/strict";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { network } from "hardhat";

describe("connectOnBefore network helpers usage", async function () {
  describe("direct usage", () => {
    const connection = network.mocha.connectOnBefore();

    it("should allow invocation of network helpers like mineUpTo", async function () {
      await connection.networkHelpers.mineUpTo(101);

      const result = await connection.provider.request({
        method: "eth_blockNumber",
      });

      assert.equal(result, numberToHexString(101));
    });
  });

  describe("destructuring usage", () => {
    const { networkHelpers, provider } = network.mocha.connectOnBefore();

    it("should allow invocation of network helpers like mineUpTo", async function () {
      await networkHelpers.mineUpTo(101);

      const result = await provider.request({
        method: "eth_blockNumber",
      });

      assert.equal(result, numberToHexString(101));
    });
  });

  describe("deep nested destructuring usage", () => {
    const {
      networkHelpers: { mineUpTo },
      provider,
    } = network.mocha.connectOnBefore();

    it("should allow invocation of network helpers like mineUpTo", async function () {
      await mineUpTo(101);

      const result = await provider.request({
        method: "eth_blockNumber",
      });

      assert.equal(result, numberToHexString(101));
    });
  });
});
