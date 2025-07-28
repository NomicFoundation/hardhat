import type { EdrNetworkAccountsUserConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatLedgerPlugin from "../src/index.js";

/**
 * Only tests the `eth_accounts` method, as it is the only one that doesn't require
 * a Ledger device to be connected.
 */

const HARDHAT_ACCOUNTS: EdrNetworkAccountsUserConfig = [
  {
    balance: "1000000000000000000000",
    privateKey:
      "902e33084cc324e03ae7e149328db6961a42c01bcf04ea947cd1c9c377f2d5fe",
  },
  {
    balance: "1000000000000000000000",
    privateKey:
      "89037083496255b251d857262fc215aa0b415372645d1b9ce3bc32edd32f2c76",
  },
];

// These addresses are derived from the private keys of the above accounts
const HARDHAT_ACCOUNTS_ADDRESSES = [
  "0x2951cc54640e7fe93d7ee4d23fe75ddb020bab46",
  "0x11916e0bbe06e44d98aa313d51cd5c26d82cf65c",
];

const LEDGER_ADDRESSES = [
  "0xa809931e3b38059adae9bc5455bc567d0509ab92",
  "0xda6a52afdae5ff66aa786da68754a227331f56e3",
  "0xbc307688a80ec5ed0edc1279c44c1b34f7746bda",
];

describe("LedgerHandler", () => {
  describe("eth_accounts", async () => {
    it("should return both ledger and non-ledger accounts", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatLedgerPlugin],
        networks: {
          default: {
            type: "edr",
            accounts: HARDHAT_ACCOUNTS,
            ledgerAccounts: LEDGER_ADDRESSES,
          },
        },
      });

      const { provider } = await hre.network.connect();

      const res = await provider.request({ method: "eth_accounts" });

      assert.deepEqual(res, [
        ...HARDHAT_ACCOUNTS_ADDRESSES,
        ...LEDGER_ADDRESSES,
      ]);
    });

    it("should return only the non-ledger accounts", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatLedgerPlugin],
        networks: {
          default: {
            type: "edr",
            accounts: HARDHAT_ACCOUNTS,
          },
        },
      });

      const { provider } = await hre.network.connect();

      const res = await provider.request({ method: "eth_accounts" });

      assert.deepEqual(res, HARDHAT_ACCOUNTS_ADDRESSES);
    });
  });

  it("should work with multiple connections", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedgerPlugin],
      networks: {
        firstConnection: {
          type: "edr",
          accounts: HARDHAT_ACCOUNTS,
          ledgerAccounts: LEDGER_ADDRESSES,
        },
        secondConnection: {
          type: "edr",
          accounts: [], // No edr accounts
          ledgerAccounts: LEDGER_ADDRESSES,
        },
      },
    });

    const { provider: firsProvider } =
      await hre.network.connect("firstConnection");
    const { provider: secondProvider } =
      await hre.network.connect("secondConnection");

    const firstRes = await firsProvider.request({ method: "eth_accounts" });
    assert.deepEqual(firstRes, [
      ...HARDHAT_ACCOUNTS_ADDRESSES,
      ...LEDGER_ADDRESSES,
    ]);

    const secondRes = await secondProvider.request({ method: "eth_accounts" });
    assert.deepEqual(secondRes, [...LEDGER_ADDRESSES]);
  });
});
