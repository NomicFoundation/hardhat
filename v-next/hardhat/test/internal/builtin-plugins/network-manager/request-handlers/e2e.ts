import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { createMockedNetworkHre } from "./hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("request-handlers - e2e", () => {
  it("should successfully executes all the handlers setting fixed values", async () => {
    // should use the handlers: ChainIdValidatorHandler, FixedGasHandler

    const FIXED_GAS_LIMIT = 1231n;

    const hre = await createMockedNetworkHre(
      {
        networks: {
          localhost: {
            gas: FIXED_GAS_LIMIT,
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
          },
        },
      },
      {
        eth_chainId: "0x1",
      },
    );

    // Use the localhost network for these tests because the modifier is only
    // applicable to HTTP networks. EDR networks do not require this modifier.
    const connection = await hre.network.connect("localhost");

    const res = await connection.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000012",
        },
      ],
    });

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(res[0].gas, numberToHexString(FIXED_GAS_LIMIT));
  });

  it("should successfully executes all the handlers setting automatic values", async () => {
    // should use the handlers: ChainIdValidatorHandler, AutomaticGasHandler

    const FIXED_GAS_LIMIT = 1231;
    const GAS_MULTIPLIER = 1.337;

    const hre = await createMockedNetworkHre(
      {
        networks: {
          localhost: {
            gas: "auto",
            gasMultiplier: GAS_MULTIPLIER,
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
          },
        },
      },
      {
        eth_chainId: "0x1",
        eth_getBlockByNumber: {
          gasLimit: numberToHexString(FIXED_GAS_LIMIT * 1000),
        },
        eth_estimateGas: numberToHexString(FIXED_GAS_LIMIT),
      },
    );

    // Use the localhost network for these tests because the modifier is only
    // applicable to HTTP networks. EDR networks do not require this modifier.
    const connection = await hre.network.connect("localhost");

    const res = await connection.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000012",
        },
      ],
    });

    assert.ok(Array.isArray(res), "res should be an array");

    assert.equal(
      res[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
  });
});
