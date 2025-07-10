import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatLedger from "../src/index.js";

describe("config validation", () => {
  it("should work when the ledger config is not present", async () => {
    await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedger],
    });
  });

  it("should work when only the ledger accounts are present", async () => {
    await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedger],
      networks: {
        "test-network": {
          type: "edr",
          ledgerAccounts: [
            "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            "0xda6a52afdae5ff66aa786da68754a227331f56e3",
          ],
        },
      },
    });
  });

  it("should work with multiple networks", async () => {
    await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedger],
      networks: {
        "test-network-1": {
          type: "edr",
          ledgerAccounts: [
            "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            "0xda6a52afdae5ff66aa786da68754a227331f56e3",
          ],
        },
        "test-network-2": {
          type: "http",
          url: "http://localhost:8545",
          ledgerAccounts: [
            "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            "0xda6a52afdae5ff66aa786da68754a227331f56e3",
          ],
        },
      },
    });
  });

  it("should work when both the ledger accounts and the derivationFunction are present", async () => {
    await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedger],
      networks: {
        "test-network": {
          type: "edr",
          ledgerAccounts: [
            "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            "0xda6a52afdae5ff66aa786da68754a227331f56e3",
          ],
          ledgerOptions: {
            derivationFunction: (x) => `m/44'/60'/0'/${x}`,
          },
        },
      },
    });
  });

  it("should work when both the ledger accounts and the ledgerOptions are present as an empty object", async () => {
    await createHardhatRuntimeEnvironment({
      plugins: [hardhatLedger],
      networks: {
        "test-network": {
          type: "edr",
          ledgerAccounts: [
            "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            "0xda6a52afdae5ff66aa786da68754a227331f56e3",
          ],
          ledgerOptions: {},
        },
      },
    });
  });

  it("should throw when a ledger account is invalid", async () => {
    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment({
        plugins: [hardhatLedger],
        networks: {
          "test-network": {
            type: "edr",
            ledgerAccounts: ["0xa809931e3b"],
          },
        },
      }),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors: [
          `\t* Config error in config.ledgerAccounts.0: network "test-network" - Each ledger account must be a valid 42 character hexadecimal string`,
        ].join("\n"),
      },
    );
  });

  it("should throw when a ledger account is invalid in multiple networks", async () => {
    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment({
        plugins: [hardhatLedger],
        networks: {
          "test-network-1": {
            type: "edr",
            ledgerAccounts: ["0xa809931e3b"],
          },
          "test-network-2": {
            type: "http",
            url: "http://localhost:8545",
            ledgerAccounts: ["0xa809931e3b"],
          },
        },
      }),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors: [
          `\t* Config error in config.ledgerAccounts.0: network "test-network-1" - Each ledger account must be a valid 42 character hexadecimal string`,
          `\t* Config error in config.ledgerAccounts.0: network "test-network-2" - Each ledger account must be a valid 42 character hexadecimal string`,
        ].join("\n"),
      },
    );
  });
});
