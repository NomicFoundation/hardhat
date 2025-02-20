import type {
  GenericChainType,
  NetworkConnection,
} from "hardhat/types/network";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatViem from "../../src/index.js";

describe("hook-handlers/network", () => {
  describe("newConnection", () => {
    let connection: NetworkConnection<GenericChainType>;

    before(async () => {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatViem],
      });
      connection = await hre.network.connect();
    });

    it("should be extended with viem", () => {
      assert.ok(isObject(connection.viem), "viem should be defined");

      assert.ok(
        typeof connection.viem.getPublicClient === "function",
        "viem should have a getPublicClient function",
      );
      assert.ok(
        typeof connection.viem.getWalletClients === "function",
        "viem should have a getWalletClients function",
      );
      assert.ok(
        typeof connection.viem.getWalletClient === "function",
        "viem should have a getWalletClient function",
      );
      assert.ok(
        typeof connection.viem.getTestClient === "function",
        "viem should have a getTestClient function",
      );
      assert.ok(
        typeof connection.viem.deployContract === "function",
        "viem should have a deployContract function",
      );
      assert.ok(
        typeof connection.viem.sendDeploymentTransaction === "function",
        "viem should have a sendDeploymentTransaction function",
      );
      assert.ok(
        typeof connection.viem.getContractAt === "function",
        "viem should have a getContractAt function",
      );
    });
  });
});
