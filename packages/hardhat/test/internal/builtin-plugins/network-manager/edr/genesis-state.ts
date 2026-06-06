import type { EdrNetworkAccountsConfig } from "../../../../../src/types/config.js";
import type { AccountOverride } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CANCUN, LONDON } from "@nomicfoundation/edr";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { hexToBytes } from "ethereum-cryptography/utils";

import {
  getGenesisStateAndOwnedAccounts,
  mergeGenesisState,
} from "../../../../../src/internal/builtin-plugins/network-manager/edr/genesis-state.js";
import { L1_CHAIN_TYPE } from "../../../../../src/internal/constants.js";
import { FixedValueConfigurationVariable } from "../../../../../src/internal/core/configuration-variables.js";

describe("getGenesisStateAndOwnedAccounts", () => {
  const accounts: EdrNetworkAccountsConfig = {
    mnemonic: new FixedValueConfigurationVariable(
      "test test test test test test test test test test test junk",
    ),
    accountsBalance: 10000000000000000000000n,
    count: 2,
    initialIndex: 0,
    passphrase: new FixedValueConfigurationVariable(""),
    path: "m/44'/60'/0'/0",
  };

  it("should return cached result for same config references", async () => {
    const result1 = await getGenesisStateAndOwnedAccounts(
      accounts,
      undefined,
      L1_CHAIN_TYPE,
      CANCUN,
    );

    const result2 = await getGenesisStateAndOwnedAccounts(
      accounts,
      undefined,
      L1_CHAIN_TYPE,
      CANCUN,
    );

    assert.equal(result1, result2);
  });

  it("should return different results (by reference) if any of the parameters change, even if the change is only by reference (same values)", async () => {
    const result1 = await getGenesisStateAndOwnedAccounts(
      accounts,
      undefined,
      L1_CHAIN_TYPE,
      CANCUN,
    );

    const result2 = await getGenesisStateAndOwnedAccounts(
      accounts,
      undefined,
      L1_CHAIN_TYPE,
      LONDON,
    );

    const result3 = await getGenesisStateAndOwnedAccounts(
      { ...accounts },
      undefined,
      L1_CHAIN_TYPE,
      LONDON,
    );

    assert.notEqual(result1, result2);
    assert.notEqual(result2, result3);
    assert.notEqual(result3, result1);
  });

  describe("mergeGenesisState", () => {
    const address = hexToBytes("0x0000F90827F1C53a10cb7A02335B175320002935");
    const addressKey = bytesToHexString(address);

    let genesisState: Map<string, AccountOverride>;

    beforeEach(() => {
      genesisState = new Map();
    });

    it("when the chain list is empty, leaves the map untouched", () => {
      genesisState.set(addressKey, { address, balance: 1n });
      mergeGenesisState(genesisState, []);
      assert.equal(genesisState.size, 1);
      assert.equal(genesisState.get(addressKey)?.balance, 1n);
    });

    it("when the chain address is not in the map, adds it as a new entry", () => {
      mergeGenesisState(genesisState, [{ address, balance: 42n }]);
      assert.equal(genesisState.size, 1);
      assert.equal(genesisState.get(addressKey)?.balance, 42n);
    });

    it("when a chain entry collides with an existing override, user wins overlapping fields and chain fills the gaps", () => {
      genesisState.set(addressKey, { address, balance: 1n, nonce: 1n });

      mergeGenesisState(genesisState, [
        { address, balance: 9n, code: new Uint8Array([0x99]) },
      ]);

      const merged = genesisState.get(addressKey);
      assert.ok(merged !== undefined, "merged entry must exist at the address");
      assert.equal(genesisState.size, 1, "must not duplicate the entry");
      assert.equal(merged.balance, 1n, "user wins on overlapping field");
      assert.equal(merged.nonce, 1n, "user-only field stays");
      assert.deepEqual(
        merged.code,
        new Uint8Array([0x99]),
        "chain-only field fills in",
      );
    });
  });
});
