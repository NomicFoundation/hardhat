import type { NetworkConnection } from "../../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

const LATEST_BASE_FEE_IN_MOCKED_PROVIDER = 80;

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - AutomaticGasPrice", () => {
  let connection: NetworkConnection<"unknown">;

  beforeEach(async () => {
    const hre = await createMockedNetworkHre({
      eth_feeHistory: {
        baseFeePerGas: [
          numberToHexString(LATEST_BASE_FEE_IN_MOCKED_PROVIDER),
          numberToHexString(
            Math.floor((LATEST_BASE_FEE_IN_MOCKED_PROVIDER * 9) / 8),
          ),
        ],
        reward: [["0x4"]],
      },

      eth_getBlockByNumber: {
        baseFeePerGas: "0x1",
      },
    });

    connection = await hre.network.connect();
  });

  it("should use the reward return value as default maxPriorityFeePerGas", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1,
        maxFeePerGas: "0x99",
      },
    ]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0].maxPriorityFeePerGas, "0x4");
    assert.equal(res[0].maxFeePerGas, "0x99");
  });
});
