import type {
  GenericChainType,
  NetworkConnection,
} from "hardhat/types/network";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatVerify from "../../src/index.js";

describe("hook-handlers/network", () => {
  describe("newConnection", () => {
    let connection: NetworkConnection<GenericChainType>;

    before(async () => {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatVerify],
      });
      connection = await hre.network.connect();
    });

    it("should extend connection with verifier property", () => {
      assert.ok(isObject(connection.verifier), "verifier should be defined");
    });

    it("should have verifier with etherscan property", () => {
      assert.ok(
        isObject(connection.verifier.etherscan),
        "verifier.etherscan should be defined",
      );
    });

    it("should have etherscan with all getter methods", () => {
      const { etherscan } = connection.verifier;

      assert.equal(
        typeof etherscan.getChainId,
        "function",
        "etherscan should have a getChainId function",
      );
      assert.equal(
        typeof etherscan.getName,
        "function",
        "etherscan should have a getName function",
      );
      assert.equal(
        typeof etherscan.getUrl,
        "function",
        "etherscan should have a getUrl function",
      );
      assert.equal(
        typeof etherscan.getApiUrl,
        "function",
        "etherscan should have a getApiUrl function",
      );
      assert.equal(
        typeof etherscan.getApiKey,
        "function",
        "etherscan should have a getApiKey function",
      );
      assert.equal(
        typeof etherscan.getContractUrl,
        "function",
        "etherscan should have a getContractUrl function",
      );
    });

    it("should have etherscan with all verification methods", () => {
      const { etherscan } = connection.verifier;

      assert.equal(
        typeof etherscan.isVerified,
        "function",
        "etherscan should have an isVerified function",
      );
      assert.equal(
        typeof etherscan.verify,
        "function",
        "etherscan should have a verify function",
      );
      assert.equal(
        typeof etherscan.pollVerificationStatus,
        "function",
        "etherscan should have a pollVerificationStatus function",
      );
      assert.equal(
        typeof etherscan.customApiCall,
        "function",
        "etherscan should have a customApiCall function",
      );
    });

    it("should create independent verifier instances for each connection", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatVerify],
      });
      const connection1 = await hre.network.connect();
      const connection2 = await hre.network.connect();

      assert.notEqual(
        connection1.verifier,
        connection2.verifier,
        "Each connection should have its own verifier instance",
      );
    });
  });
});
