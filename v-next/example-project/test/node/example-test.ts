import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "@ignored/hardhat-vnext";

describe("Example test", () => {
  it("should work", async () => {
    assert.equal(1 + 1, 2);

    const connection = await hre.network.connect("myEdrNetwork", "l1", {
      type: "edr",
      chainId: 31337,
    });

    const blockNumber = await connection.provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assert.equal(blockNumber, 99);
  });
});
