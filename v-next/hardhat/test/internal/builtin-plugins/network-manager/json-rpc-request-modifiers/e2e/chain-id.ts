import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createMockedNetworkHre } from "../hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - ChainIdValidator", () => {
  describe("eth_chainId", () => {
    it("should not fail because the chain id is the same as the one returned by eth_chainId", async () => {
      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
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

      await connection.provider.request({
        method: "eth_sendTransaction",
        params: [],
      });
    });

    it("should fail because the chain id is different from the one returned by eth_chainId", async () => {
      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              chainId: 2,
            },
          },
        },
        {
          eth_chainId: "0x1",
        },
      );

      const connection = await hre.network.connect("localhost");

      await assertRejectsWithHardhatError(
        connection.provider.request({
          method: "eth_sendTransaction",
          params: [],
        }),
        HardhatError.ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
        {
          configChainId: 2,
          connectionChainId: 1,
        },
      );
    });
  });

  describe("net_version", () => {
    beforeEach(async () => {});

    it("should not fail because the chain id is the same as the one returned by net_version", async () => {
      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              chainId: 1,
            },
          },
        },
        {
          eth_chainId: undefined, // simulate an error for the method eth_chainId
          net_version: "0x1",
        },
      );

      // Use the localhost network for these tests because the modifier is only
      // applicable to HTTP networks. EDR networks do not require this modifier.
      const connection = await hre.network.connect("localhost");

      await connection.provider.request({
        method: "eth_sendTransaction",
        params: [],
      });
    });

    it("should fail because the chain id is different from the one returned by net_version", async () => {
      const hre = await createMockedNetworkHre(
        {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              chainId: 2,
            },
          },
        },
        {
          eth_chainId: undefined, // simulate an error for the method eth_chainId
          net_version: "0x1",
        },
      );

      const connection = await hre.network.connect("localhost");

      await assertRejectsWithHardhatError(
        connection.provider.request({
          method: "eth_sendTransaction",
          params: [],
        }),
        HardhatError.ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
        {
          configChainId: 2,
          connectionChainId: 1,
        },
      );
    });
  });
});
