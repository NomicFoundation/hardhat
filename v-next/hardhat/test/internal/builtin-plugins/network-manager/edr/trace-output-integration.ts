import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";

describe("Trace output integration", () => {
  let hre: HardhatRuntimeEnvironment;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("Connection ID + label propagation", () => {
    it("should assign incrementing connection IDs that are not reused after close", async () => {
      const conn0 = await hre.network.connect();
      const conn1 = await hre.network.connect();
      assert.equal(conn0.id, 0);
      assert.equal(conn1.id, 1);

      // Close conn0 and create a new connection — ID should NOT be reused
      await conn0.close();
      const conn2 = await hre.network.connect();
      assert.equal(
        conn2.id,
        2,
        "Connection IDs should keep incrementing after close",
      );
    });

    it("should use the correct network name in the connection", async () => {
      const conn = await hre.network.connect();
      assert.equal(
        conn.networkName,
        "default",
        "Default network name should be 'default'",
      );
    });
  });

  describe("Verbosity integration", () => {
    it("should default to verbosity that produces no traces", async () => {
      // Default HRE has verbosity 2, which maps to IncludeTraces.None
      // Just verify the provider works without any trace-related errors
      const { provider } = await hre.network.connect();
      const accounts = await provider.request({
        method: "eth_accounts",
      });
      assert.ok(Array.isArray(accounts), "Expected accounts to be an array");
      const sender = accounts[0];
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: sender, to: sender, value: "0x1" }],
      });
      assert.ok(typeof txHash === "string", "Should return a tx hash");
    });

    it("should work with high verbosity without errors", async () => {
      // Create HRE with verbosity=4 (IncludeTraces.All)
      // Just verify it doesn't crash
      const highVerbHre = await createHardhatRuntimeEnvironment(
        {},
        { verbosity: 4 },
      );
      const { provider } = await highVerbHre.network.connect();
      const accounts = await provider.request({
        method: "eth_accounts",
      });
      assert.ok(Array.isArray(accounts), "Expected accounts to be an array");
      const sender = accounts[0];
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: sender, to: sender, value: "0x1" }],
      });
      assert.ok(typeof txHash === "string", "Should return a tx hash");
    });
  });

  describe("Multi-connection isolation", () => {
    it("should allow closing one connection without affecting another", async () => {
      const conn1 = await hre.network.connect();
      const conn2 = await hre.network.connect();

      await conn1.close();

      // conn2 should still work
      const chainId = await conn2.provider.request({
        method: "eth_chainId",
      });
      assert.ok(typeof chainId === "string", "Expected chainId to be a string");

      // conn1 should throw PROVIDER_CLOSED
      await assertRejectsWithHardhatError(
        conn1.provider.request({ method: "eth_chainId" }),
        HardhatError.ERRORS.CORE.NETWORK.PROVIDER_CLOSED,
        {},
      );
    });

    it("should handle concurrent transactions on separate connections", async () => {
      const conn1 = await hre.network.connect();
      const conn2 = await hre.network.connect();

      const accounts1 = await conn1.provider.request({
        method: "eth_accounts",
      });
      assert.ok(Array.isArray(accounts1), "accounts1 should be an array");
      const accounts2 = await conn2.provider.request({
        method: "eth_accounts",
      });
      assert.ok(Array.isArray(accounts2), "accounts2 should be an array");
      const sender1 = accounts1[0];
      const sender2 = accounts2[0];

      // Send transactions concurrently
      const [hash1, hash2] = await Promise.all([
        conn1.provider.request({
          method: "eth_sendTransaction",
          params: [{ from: sender1, to: sender1, value: "0x1" }],
        }),
        conn2.provider.request({
          method: "eth_sendTransaction",
          params: [{ from: sender2, to: sender2, value: "0x1" }],
        }),
      ]);

      assert.ok(typeof hash1 === "string", "First tx should succeed");
      assert.ok(typeof hash2 === "string", "Second tx should succeed");
    });
  });
});
