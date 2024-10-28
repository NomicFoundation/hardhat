import type { NetworkConnection } from "../../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

const FIXED_GAS_LIMIT = 1231n;

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - FixedGas", () => {
  let connection: NetworkConnection<"unknown">;

  beforeEach(async () => {
    const hre = await createMockedNetworkHre({});

    connection = await hre.network.connect();

    connection.networkConfig.gas = FIXED_GAS_LIMIT;
  });

  it("should set the fixed gas if not present", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 1,
      },
    ]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0].gas, numberToHexString(FIXED_GAS_LIMIT));
  });
});
