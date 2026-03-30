import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getChainId } from "../src/internal/chains.js";

import { MockEthereumProvider } from "./utils.js";

describe("chains", () => {
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
