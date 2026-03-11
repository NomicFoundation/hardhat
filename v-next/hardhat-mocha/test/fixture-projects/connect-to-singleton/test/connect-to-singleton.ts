import assert from "node:assert/strict";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { network } from "hardhat";

const connection = network.mocha.connectToSingleton();

describe("connectToSingleton", function () {
  it("should have a valid connection", function () {
    assert.ok(connection !== undefined);
    assert.ok(typeof connection.id === "number");
  });

  it("should have a valid provider", async function () {
    const result = await connection.provider.request({
      method: "eth_blockNumber",
    });

    assert.ok(result !== undefined);
  });

  it("should allow sending transactions", async function () {
    const [sender, recipient] = await connection.provider.request({
      method: "eth_accounts",
    });

    await connection.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: sender,
          to: recipient,
          value: numberToHexString(10n ** 18n),
        },
      ],
    });

    const balance = await connection.provider.request({
      method: "eth_getBalance",
      params: [recipient],
    });

    assert.ok(BigInt(balance) > 0n);
  });
});
