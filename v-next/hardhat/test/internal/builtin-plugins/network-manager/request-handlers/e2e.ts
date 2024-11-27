import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { createMockedNetworkHre } from "./hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("request-handlers - e2e", () => {
  it("should successfully executes all the handlers that set fixed values", async () => {
    // should use the handlers in this order: ChainIdValidatorHandler, FixedGasHandler, FixedGasPriceHandler, FixedSenderHandler

    const FIXED_GAS_LIMIT = 1231n;
    const FIXED_GAS_PRICE = 1232n;

    const hre = await createMockedNetworkHre(
      {
        networks: {
          localhost: {
            gas: FIXED_GAS_LIMIT,
            gasPrice: FIXED_GAS_PRICE,
            from: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
          },
        },
      },
      // List of methods that the handlers will call; we mock the responses
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
          to: "0x0000000000000000000000000000000000000012",
        },
      ],
    });

    assert.ok(Array.isArray(res), "res should be an array");

    // gas
    assert.equal(res[0].gas, numberToHexString(FIXED_GAS_LIMIT));
    // gasPrice
    assert.equal(res[0].gasPrice, numberToHexString(FIXED_GAS_PRICE));
    // sender
    assert.equal(res[0].from, "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });

  it("should successfully executes all the handlers that set automatic values", async () => {
    // should use the handlers in this order: ChainIdValidatorHandler, AutomaticGasHandler, AutomaticGasPriceHandler, AutomaticSenderHandler

    const FIXED_GAS_LIMIT = 1231;
    const GAS_MULTIPLIER = 1.337;
    const LATEST_BASE_FEE_IN_MOCKED_PROVIDER = 80;

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
        // List of methods that the handlers will call; we mock the responses
        eth_chainId: "0x1",
        eth_getBlockByNumber: {
          baseFeePerGas: "0x1",
          gasLimit: numberToHexString(FIXED_GAS_LIMIT * 1000),
        },
        eth_estimateGas: numberToHexString(FIXED_GAS_LIMIT),
        eth_feeHistory: {
          baseFeePerGas: [
            numberToHexString(LATEST_BASE_FEE_IN_MOCKED_PROVIDER),
            numberToHexString(
              Math.floor((LATEST_BASE_FEE_IN_MOCKED_PROVIDER * 9) / 8),
            ),
          ],
          reward: [["0x4"]],
        },
        eth_accounts: ["0x123006d4548a3ac17d72b372ae1e416bf65b8eaf"],
      },
    );

    // Use the localhost network for these tests because the modifier is only
    // applicable to HTTP networks. EDR networks do not require this modifier.
    const connection = await hre.network.connect("localhost");

    const res = await connection.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          to: "0x0000000000000000000000000000000000000012",
          maxFeePerGas: "0x99",
        },
      ],
    });

    assert.ok(Array.isArray(res), "res should be an array");

    // gas
    assert.equal(
      res[0].gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
    // gas price
    assert.equal(res[0].maxPriorityFeePerGas, "0x4");
    assert.equal(res[0].maxFeePerGas, "0x99");
    // sender
    assert.equal(res[0].from, "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf");
  });
});
