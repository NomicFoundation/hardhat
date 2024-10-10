import type { NetworkConnection } from "../../../../../../src/types/network.js";

import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createMockedNetworkHre } from "../hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("e2e - ChainIdValidator", () => {
  let connection: NetworkConnection<"unknown">;

  describe("eth_chainId", () => {
    beforeEach(async () => {
      const hre = await createMockedNetworkHre({
        eth_chainId: "0x1",
      });

      connection = await hre.network.connect();
    });

    it("should not fail because the chain id is the same as the one returned by eth_chainId", async () => {
      connection.networkConfig.chainId = 1;

      await connection.provider.request({
        method: "eth_sendTransaction",
        params: [],
      });
    });

    it("should fail because the chain id is different from the one returned by eth_chainId", async () => {
      connection.networkConfig.chainId = 2;

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
    beforeEach(async () => {
      const hre = await createMockedNetworkHre({
        eth_chainId: undefined, // simulate an error for the method eth_chainId
        net_version: "0x1",
      });

      connection = await hre.network.connect();
    });

    it("should not fail because the chain id is the same as the one returned by net_version", async () => {
      connection.networkConfig.chainId = 1;

      await connection.provider.request({
        method: "eth_sendTransaction",
        params: [],
      });
    });

    it("should fail because the chain id is different from the one returned by net_version", async () => {
      connection.networkConfig.chainId = 2;

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
