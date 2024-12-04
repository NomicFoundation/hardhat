import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - FixedGasPrice", () => {
  const FIXED_GAS_PRICE = 1232n;

  it("should set the fixed gas price if not present", async () => {
    const hre = await createMockedNetworkHre(
      {
        networks: {
          hardhat: {
            type: "edr",
            gasPrice: FIXED_GAS_PRICE,
          },
        },
      },
      {},
    );

    const connection = await hre.network.connect();

    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1,
      },
    ]);

    const res = await connection.provider.request(jsonRpcRequest);

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0].gasPrice, numberToHexString(FIXED_GAS_PRICE));
  });
});
