import type { NetworkConnection } from "../../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { createJsonRpcRequest } from "../../helpers.js";
import { createMockedNetworkHre } from "../../hooks-mock.js";

const FIXED_GAS_LIMIT = 1231;
const GAS_MULTIPLIER = 1.337;

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - AutomaticGas", () => {
  let connection: NetworkConnection<"unknown">;

  beforeEach(async () => {
    const hre = await createMockedNetworkHre({
      eth_getBlockByNumber: {
        gasLimit: numberToHexString(FIXED_GAS_LIMIT * 1000),
      },
      eth_estimateGas: numberToHexString(FIXED_GAS_LIMIT),
    });

    connection = await hre.network.connect();
  });

  it("should estimate gas automatically if not present", async () => {
    connection.networkConfig.gas = "auto";
    connection.networkConfig.gasMultiplier = GAS_MULTIPLIER;

    const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 1,
      },
    ]);

    const res = await connection.provider.request(jsonRpcRequest);

    assertHardhatInvariant(Array.isArray(res), "res should be an array");

    assert.equal(
      res[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
  });
});
