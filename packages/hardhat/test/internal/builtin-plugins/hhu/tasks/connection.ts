import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  requestHex,
  withConnection,
} from "../../../../../src/internal/builtin-plugins/hhu/tasks/connection.js";
import { ProviderError } from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("withConnection", () => {
  it("throws network errors as HardhatErrors, with a remote node's revert data", async () => {
    const hre = await createHardhatRuntimeEnvironment({});

    // Like the error the HTTP provider throws for a remote node's revert
    const error = new ProviderError("execution reverted", 3);
    error.data = "0xdeadbeef";

    await assertRejectsWithHardhatError(
      withConnection(hre, async () => {
        throw error;
      }),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      { code: 3, message: 'execution reverted, data: "0xdeadbeef"' },
    );
  });

  it("connects without the network's accounts when read-only", async () => {
    const hre = await createHardhatRuntimeEnvironment({});

    // The default network has 20 accounts; a read-only connection has none,
    // so a keystore-backed private key is never resolved
    const accounts = await withConnection(
      hre,
      async (connection) =>
        await connection.provider.request({ method: "eth_accounts" }),
      { readOnly: true },
    );

    assert.deepEqual(accounts, []);
  });
});

describe("requestHex", () => {
  it("throws when the result is not hex", async () => {
    const hre = await createHardhatRuntimeEnvironment({});
    hre.hooks.registerHandlers("network", {
      onRequest: async (_context, _connection, request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: "0xZZ",
      }),
    });

    await assertRejectsWithHardhatError(
      requestHex(hre, "eth_getCode"),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: "eth_getCode should return a hex string" },
    );
  });
});
