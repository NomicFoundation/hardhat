import assert from "node:assert/strict";
import { network } from "hardhat";

// Both file-a and file-b call connectToSingleton() — they should share the
// same underlying connection.
const connection = network.mocha.connectToSingleton();

describe("singleton file B", function () {
  it("should have a valid connection", function () {
    assert.ok(connection !== undefined);
    assert.ok(typeof connection.id === "number");
  });

  it("should allow provider requests", async function () {
    const result = await connection.provider.request({
      method: "eth_chainId",
    });

    assert.ok(result !== undefined);
  });
});
