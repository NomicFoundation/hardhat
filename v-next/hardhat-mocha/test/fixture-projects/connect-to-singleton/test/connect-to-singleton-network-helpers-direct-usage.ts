import assert from "node:assert/strict";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { network } from "hardhat";

const connection = network.mocha.connectToSingleton();

describe("connectToSingleton network helpers - direct usage", function () {
  it("should allow invocation of network helpers like mineUpTo", async function () {
    const beforeMiningBlock = await connection.provider.request({
      method: "eth_blockNumber",
    });

    await connection.networkHelpers.mineUpTo(Number(beforeMiningBlock) + 101);

    const result = await connection.provider.request({
      method: "eth_blockNumber",
    });

    assert.equal(result, numberToHexString(Number(beforeMiningBlock) + 101));
  });
});
