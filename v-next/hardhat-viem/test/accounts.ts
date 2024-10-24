import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAccounts } from "../src/internal/accounts.js";

import { MockEthereumProvider } from "./utils.js";

describe("accounts", () => {
  describe("getAccounts", async () => {
    it("should return the accounts", async () => {
      const provider = new MockEthereumProvider({
        eth_accounts: ["0x123", "0x456"],
      });
      const accounts = await getAccounts(provider);

      assert.deepEqual(accounts, ["0x123", "0x456"]);
      assert.equal(provider.callCount, 1);
    });

    it("should cache the accounts for the same provider", async () => {
      const provider = new MockEthereumProvider({
        eth_accounts: ["0x123", "0x456"],
      });
      const accounts1 = await getAccounts(provider);
      // set different return values for the second call
      // to make sure the cache is being used
      provider.returnValues = {
        eth_accounts: ["0x789", "0xabc"],
      };
      const accounts2 = await getAccounts(provider);

      assert.deepEqual(
        accounts1,
        ["0x123", "0x456"],
        "accounts should match the expected values in the first call",
      );
      assert.deepEqual(
        accounts2,
        ["0x123", "0x456"],
        "accounts should match the expected values in the second call",
      );
      assert.equal(
        provider.callCount,
        1,
        "Provider call count should be 1 after two calls with the same provider",
      );

      // create a new provider with new return values
      // to make sure the cache is not being used
      const provider2 = new MockEthereumProvider({
        eth_accounts: ["0xde", "0xf0"],
      });
      const accounts3 = await getAccounts(provider2);

      assert.deepEqual(
        accounts3,
        ["0xde", "0xf0"],
        "accounts should match the expected values with a new provider",
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
