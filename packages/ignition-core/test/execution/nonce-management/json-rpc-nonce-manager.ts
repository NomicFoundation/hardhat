import type { JsonRpcClient } from "../../../src/internal/execution/jsonrpc-client.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { JsonRpcNonceManager } from "../../../src/internal/execution/nonce-management/json-rpc-nonce-manager.js";

/**
 * Creates a mock JsonRpcClient whose getTransactionCount returns values
 * from the provided sequence on successive calls.
 */
function createMockClient(pendingCounts: number[]): JsonRpcClient {
  let callIndex = 0;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow for testing
  return {
    getTransactionCount: async (
      _address: string,
      _blockTag: "pending" | "latest" | number,
    ): Promise<number> => {
      const lastCount = pendingCounts[pendingCounts.length - 1];
      return pendingCounts[callIndex++] ?? lastCount;
    },
  } as unknown as JsonRpcClient;
}

describe("JsonRpcNonceManager", () => {
  describe("getNextNonce", () => {
    it("should return the pending count when no prior nonce is tracked", async () => {
      const client = createMockClient([5]);
      const manager = new JsonRpcNonceManager(client, {});

      const nonce = await manager.getNextNonce("0xSender");

      assert.equal(nonce, 5);
    });

    it("should return expectedNonce when pendingCount matches", async () => {
      const client = createMockClient([3]);
      const manager = new JsonRpcNonceManager(client, { "0xSender": 2 });

      const nonce = await manager.getNextNonce("0xSender");

      assert.equal(nonce, 3);
    });

    it("should throw NONCE_TOO_HIGH when pendingCount > expectedNonce (external tx)", async () => {
      const client = createMockClient([5]);
      const manager = new JsonRpcNonceManager(client, { "0xSender": 2 });

      await assertRejectsWithHardhatError(
        manager.getNextNonce("0xSender"),
        HardhatError.ERRORS.IGNITION.EXECUTION.NONCE_TOO_HIGH,
        { sender: "0xSender", expectedNonce: 3, pendingCount: 5 },
      );
    });

    it("should succeed after retry when mempool catches up", async () => {
      // First call returns 1 (behind), retry calls return 3 (caught up)
      const client = createMockClient([1, 1, 3]);
      const manager = new JsonRpcNonceManager(client, { "0xSender": 2 });

      const nonce = await manager.getNextNonce("0xSender");

      assert.equal(nonce, 3);
    });

    it("should throw NONCE_TOO_LOW after retries exhausted (dropped tx)", async () => {
      // All calls return a count below expectedNonce
      const client = createMockClient([1, 1, 1, 1, 1]);
      const manager = new JsonRpcNonceManager(client, { "0xSender": 2 });

      await assertRejectsWithHardhatError(
        manager.getNextNonce("0xSender"),
        HardhatError.ERRORS.IGNITION.EXECUTION.NONCE_TOO_LOW,
        { sender: "0xSender", expectedNonce: 3, pendingCount: 1 },
      );
    });
  });
});
