import type { HttpNetworkHDAccountsUserConfig } from "../../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hexStringToBytes,
  numberToHexString,
} from "@ignored/hardhat-vnext-utils/hex";

import { getJsonRpcRequest } from "../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";

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
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
            gas: FIXED_GAS_LIMIT,
            gasPrice: FIXED_GAS_PRICE,
            from: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          },
        },
      },
      // List of methods that the handlers will call; we mock the responses
      {
        eth_chainId: "0x1",
      },
    );

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

    const MOCKED_GAS_LIMIT = 21000;
    const GAS_MULTIPLIER = 1.337;
    const LATEST_BASE_FEE_IN_MOCKED_PROVIDER = 80;

    const hre = await createMockedNetworkHre(
      {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
            gas: "auto",
            gasMultiplier: GAS_MULTIPLIER,
          },
        },
      },
      {
        // List of methods that the handlers will call; we mock the responses
        eth_chainId: "0x1",
        eth_getBlockByNumber: {
          baseFeePerGas: "0x1",
          gasLimit: numberToHexString(MOCKED_GAS_LIMIT * 1000),
        },
        eth_estimateGas: numberToHexString(MOCKED_GAS_LIMIT),
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
    assert.equal(
      res[0].gas,
      numberToHexString(Math.floor(MOCKED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
    // gas price
    assert.equal(res[0].maxPriorityFeePerGas, "0x4");
    // sender
    assert.equal(res[0].from, "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf");
  });

  describe("local account and HD account", () => {
    it("should successfully executes all the handlers that set automatic values using the local account", async () => {
      // should use the handlers in this order: ChainIdValidatorHandler, AutomaticGasHandler, AutomaticGasPriceHandler, LocalAccountsHandler

      const MOCKED_GAS_LIMIT = 21000;
      const GAS_MULTIPLIER = 1.337;
      const LATEST_BASE_FEE_IN_MOCKED_PROVIDER = 80;
      const accounts = [
        "0xd78629ec714c4c72e04e294bb21615ddcb4d15dbb63db0bd84a8e084c7134c13",
      ];

      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              chainId: 1,
              gas: "auto",
              gasMultiplier: GAS_MULTIPLIER,
              accounts,
            },
          },
        },
        {
          // List of methods that the handlers will call; we mock the responses
          eth_chainId: "0x1",
          eth_getBlockByNumber: {
            baseFeePerGas: "0x1",
            gasLimit: numberToHexString(MOCKED_GAS_LIMIT * 1000),
          },
          eth_estimateGas: numberToHexString(MOCKED_GAS_LIMIT),
          eth_feeHistory: {
            baseFeePerGas: [
              numberToHexString(LATEST_BASE_FEE_IN_MOCKED_PROVIDER),
              numberToHexString(
                Math.floor((LATEST_BASE_FEE_IN_MOCKED_PROVIDER * 9) / 8),
              ),
            ],
            reward: [["0x4"]],
          },
          eth_getTransactionCount: numberToHexString(0x8),
        },
      );

      const connection = await hre.network.connect("localhost");

      const tx = {
        from: "0x4F3e91d2CaCd82FffD1f33A0d26d4078401986e9",
        to: "0x4F3e91d2CaCd82FffD1f33A0d26d4078401986e9",
      };

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

      const res = await connection.provider.request(jsonRpcRequest);

      assert.ok(Array.isArray(res), "params should be an array");

      const rawTransaction = hexStringToBytes(res[0]);

      // The tx type is encoded in the first byte, and it must be the EIP-1559 one
      assert.equal(rawTransaction[0], 2);
    });

    it("should successfully executes all the handlers that set automatic values using the HD account", async () => {
      // should use the handlers in this order: ChainIdValidatorHandler, AutomaticGasHandler, AutomaticGasPriceHandler, HDAccountsHandler

      const MOCKED_GAS_LIMIT = 21000;
      const GAS_MULTIPLIER = 1.337;
      const LATEST_BASE_FEE_IN_MOCKED_PROVIDER = 80;
      const HD_ACCOUNT: HttpNetworkHDAccountsUserConfig = {
        mnemonic:
          "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband",
        path: "m/44'/60'/0'/0/",
        initialIndex: 0,
        count: 2,
        passphrase: "",
      };

      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              chainId: 1,
              gas: "auto",
              gasMultiplier: GAS_MULTIPLIER,
              accounts: HD_ACCOUNT,
            },
          },
        },
        {
          // List of methods that the handlers will call; we mock the responses
          eth_chainId: "0x1",
          eth_getBlockByNumber: {
            baseFeePerGas: "0x1",
            gasLimit: numberToHexString(MOCKED_GAS_LIMIT * 1000),
          },
          eth_estimateGas: numberToHexString(MOCKED_GAS_LIMIT),
          eth_feeHistory: {
            baseFeePerGas: [
              numberToHexString(LATEST_BASE_FEE_IN_MOCKED_PROVIDER),
              numberToHexString(
                Math.floor((LATEST_BASE_FEE_IN_MOCKED_PROVIDER * 9) / 8),
              ),
            ],
            reward: [["0x4"]],
          },
          eth_getTransactionCount: numberToHexString(0x8),
        },
      );

      const connection = await hre.network.connect("localhost");

      const tx = {
        from: "0x4F3e91d2CaCd82FffD1f33A0d26d4078401986e9",
        to: "0x4F3e91d2CaCd82FffD1f33A0d26d4078401986e9",
      };

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

      const res = await connection.provider.request(jsonRpcRequest);

      assert.ok(Array.isArray(res), "params should be an array");

      const rawTransaction = hexStringToBytes(res[0]);

      // The tx type is encoded in the first byte, and it must be the EIP-1559 one
      assert.equal(rawTransaction[0], 2);
    });
  });
});
