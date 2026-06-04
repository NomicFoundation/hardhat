import type { EdrNetworkAccountsConfig } from "../../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CANCUN, LONDON } from "@nomicfoundation/edr";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { getGenesisStateAndOwnedAccounts } from "../../../../../src/internal/builtin-plugins/network-manager/edr/genesis-state.js";
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

  it("should merge duplicate account overrides by address", async () => {
    const result = await getGenesisStateAndOwnedAccounts(
      { ...accounts },
      undefined,
      L1_CHAIN_TYPE,
      CANCUN,
    );

    const addresses = Array.from(result.genesisState.values()).map((entry) =>
      bytesToHexString(entry.address),
    );
    const uniqueAddresses = new Set(addresses);

    assert.equal(
      addresses.length,
      uniqueAddresses.size,
      "genesis state must not contain duplicate entries for the same address",
    );
    assert.equal(result.genesisState.size, addresses.length);
  });
});
