import type { EdrNetworkHDAccountsConfig } from "../../../../src/types/config.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS } from "../../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";
import {
  formatEdrNetworkConfigAccounts,
  getPublicPrivateKeysWarning,
} from "../../../../src/internal/builtin-plugins/node/helpers.js";
import { FixedValueConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

describe("node/helpers", () => {
  describe("formatEdrNetworkConfigAccounts", () => {
    let defaultAccounts: EdrNetworkHDAccountsConfig;
    let nonDefaultAccounts: EdrNetworkHDAccountsConfig;

    before(() => {
      assert.ok(
        typeof DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.passphrase ===
          "string",
        "The default passphrase has to be a string",
      );

      defaultAccounts = {
        ...DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
        mnemonic: new FixedValueConfigurationVariable(
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.mnemonic,
        ),
        passphrase: new FixedValueConfigurationVariable(
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.passphrase,
        ),
      };
      nonDefaultAccounts = {
        ...defaultAccounts,
        count: defaultAccounts.count + 1,
      };
    });

    describe("when the accounts are the default ones, the message", () => {
      it("should include entries for all the accounts", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(defaultAccounts);
        const regex = new RegExp("Account #[0-9]+:.*", "g");
        assert.equal(
          (formattedAccounts.match(regex) ?? []).length,
          defaultAccounts.count,
        );
      });

      it("should include the public private keys", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(defaultAccounts);
        const regex = new RegExp("Private Key:.*", "g");
        assert.equal(
          (formattedAccounts.match(regex) ?? []).length,
          defaultAccounts.count,
        );
      });

      it("should include the public private keys warning twice", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(defaultAccounts);
        const warning = getPublicPrivateKeysWarning();
        const regex = new RegExp(warning.replace(/[[\]]/g, "\\$&"), "g");
        assert.equal((formattedAccounts.match(regex) ?? []).length, 2);
      });
    });

    describe("when the accounts are not the default ones, the message", () => {
      it("should include entries for all the accounts", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(nonDefaultAccounts);
        const regex = new RegExp("Account #[0-9]+:.*", "g");
        assert.equal(
          (formattedAccounts.match(regex) ?? []).length,
          nonDefaultAccounts.count,
        );
      });

      it("should not include the public private keys", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(nonDefaultAccounts);
        const regex = new RegExp("Private Key:.*", "g");
        assert.equal((formattedAccounts.match(regex) ?? []).length, 0);
      });

      it("should not include the public private keys warning", async () => {
        const formattedAccounts =
          await formatEdrNetworkConfigAccounts(nonDefaultAccounts);
        const warning = getPublicPrivateKeysWarning();
        const regex = new RegExp(warning.replace(/[[\]]/g, "\\$&"), "g");
        assert.equal((formattedAccounts.match(regex) ?? []).length, 0);
      });
    });
  });
});
