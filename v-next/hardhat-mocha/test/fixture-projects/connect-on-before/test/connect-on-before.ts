import assert from "node:assert/strict";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { network } from "hardhat";
import type { NetworkConnection } from "hardhat/types/network";

describe("connectOnBefore", function () {
  describe("basic usage", function () {
    const connection = network.mocha.connectOnBefore();

    it("should have a valid connection", function () {
      assert.ok(connection !== undefined);
      assert.ok(typeof connection.id === "number");
    });

    it("should have a valid provider", async function () {
      assert.ok(connection.provider !== undefined);

      const result = await connection.provider.request({
        method: "eth_blockNumber",
      });

      assert.equal(result, numberToHexString(0));
    });

    it("should allow sending transactions", async function () {
      await assertSendEthTransferTransaction(connection.provider);
    });
  });

  describe("destructuring usage", function () {
    const { provider } = network.mocha.connectOnBefore();

    it("should allow sending transactions", async function () {
      await assertSendEthTransferTransaction(provider);
    });

    it("should handle multiple transactions", async function () {
      await assertSendEthTransferTransaction(provider);
      await assertSendEthTransferTransaction(provider);
    });
  });

  describe("passes network parameters", function () {
    const chainId = 333;

    const connection = network.mocha.connectOnBefore({
      override: {
        chainId,
      },
    });

    it("should have a valid provider", async function () {
      assert.ok(connection.provider !== undefined);

      const result = await connection.provider.request({
        method: "eth_chainId",
      });

      assert.equal(result, numberToHexString(chainId));
    });
  });

  // Check that the `after` has been run.
  // We do this by running a standard test within a nested describe block
  // and checking that the connection will not allow a request.
  describe("closeOnAfter option", function () {
    let connection: NetworkConnection<"generic">;

    describe("intentionally nested to support hooking in of before/after by connectOnBefore", () => {
      connection = network.mocha.connectOnBefore(undefined, true);

      it("should accept closeOnAfter parameter", async function () {
        const result = await connection.provider.request({
          method: "eth_blockNumber",
        });

        assert.equal(result, numberToHexString(0));
      });
    });

    after(async () => {
      assert.throws(
        () => connection.provider.request({ method: "eth_blockNumber" }),
        // The connection within the proxy has been set to undefined, so
        // calling through the proxy chain fails
        /can't be used before the.*hook/,
      );
    });
  });
});

async function assertSendEthTransferTransaction(provider: {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
}) {
  const [sender, recipient] = await provider.request({
    method: "eth_accounts",
  });

  const balanceBefore = await provider.request({
    method: "eth_getBalance",
    params: [recipient],
  });

  await provider.request({
    method: "eth_sendTransaction",
    params: [
      { from: sender, to: recipient, value: numberToHexString(10n ** 18n) },
    ],
  });

  const balanceAfter = await provider.request({
    method: "eth_getBalance",
    params: [recipient],
  });

  assert.ok(BigInt(balanceAfter) > BigInt(balanceBefore));
}
