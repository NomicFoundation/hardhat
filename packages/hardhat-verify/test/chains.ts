import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { rejectLocalNetworks, getChainId } from "../src/internal/chains.js";

import { MockEthereumProvider } from "./utils.js";

describe("chains", () => {
  describe("rejectLocalNetworks", () => {
    it("should throw for Hardhat Network chain id (31337)", () => {
      assertThrowsHardhatError(
        () => rejectLocalNetworks("hardhat", 31337),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
        { networkName: "hardhat", chainId: 31337 },
      );
    });

    it("should throw for Ganache Network chain id (1337)", () => {
      assertThrowsHardhatError(
        () => rejectLocalNetworks("localhost", 1337),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
        { networkName: "localhost", chainId: 1337 },
      );
    });

    it("should not throw for a public chain id (1)", () => {
      rejectLocalNetworks("mainnet", 1);
    });

    it("should not throw for Sepolia (11155111)", () => {
      rejectLocalNetworks("sepolia", 11155111);
    });
  });

  describe("getChainId", () => {
    it("should return the chainId", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
      const chainId = await getChainId(provider);

      assert.equal(chainId, 1);
      assert.equal(provider.callCount, 1);
    });

    it("should cache the chainId for the same provider", async () => {
      const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
      const chainId1 = await getChainId(provider);
      // set different return values for the second call
      // to make sure the cache is being used
      provider.returnValues = {
        eth_chainId: "0x2",
      };
      const chainId2 = await getChainId(provider);

      assert.equal(
        chainId1,
        1,
        "chainId should match the expected value in the first call",
      );
      assert.equal(
        chainId2,
        1,
        "chainId should match the expected value in the second call",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should be 1 after two calls with the same provider",
      );

      // create a new provider with new return values
      // to make sure the cache is not being used
      const provider2 = new MockEthereumProvider({ eth_chainId: "0x3" });
      const chainId3 = await getChainId(provider2);

      assert.equal(
        chainId3,
        3,
        "chainId should match the expected value with a new provider",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should still be 1 after using a different provider",
      );
      assert.equal(
        provider2.callCount,
        1,
        "Second provider call count should be 1",
      );
    });
  });
});
