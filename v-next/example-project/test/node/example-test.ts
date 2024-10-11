import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "@ignored/hardhat-vnext";

describe("Example EDR based test", () => {
  it("should work get the block number from the EDR Network", async () => {
    const connection = await hre.network.connect();

    const blockNumberAtStart = await connection.provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assert.equal(blockNumberAtStart, `0x0`);

    await connection.networkHelpers.mine(5);

    const blockNumberAfter = await connection.provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assert.equal(blockNumberAfter, `0x5`);
  });
});
