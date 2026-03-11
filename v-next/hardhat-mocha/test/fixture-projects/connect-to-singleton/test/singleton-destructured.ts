import assert from "node:assert/strict";
import { network } from "hardhat";

// Destructuring at module scope should work the same as connectOnBefore
const { provider } = network.mocha.connectToSingleton();

describe("singleton destructured", function () {
  it("should support destructuring", async function () {
    const result = await provider.request({
      method: "eth_blockNumber",
    });

    assert.ok(result !== undefined);
  });
});
