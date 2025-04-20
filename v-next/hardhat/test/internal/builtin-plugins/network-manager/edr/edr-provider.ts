import type { EdrNetworkHDAccountsConfig } from "../../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type { SubscriptionEvent } from "@ignored/edr-optimism";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EdrProvider,
  isDefaultEdrNetworkHDAccountsConfig,
} from "../../../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";
import {
  InvalidArgumentsError,
  ProviderError,
} from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { EDR_NETWORK_REVERT_SNAPSHOT_EVENT } from "../../../../../src/internal/constants.js";
import { FixedValueConfigurationVariable } from "../../../../../src/internal/core/configuration-variables.js";

describe("edr-provider", () => {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("EdrProvider#request", () => {
    it(
      "should emit an event when the method is evm_revert",
      { timeout: 1000 },
      async () => {
        let eventEmitted = false;
        const { provider } = await hre.network.connect();

        const eventPromise = new Promise<void>((resolve) => {
          provider.on(EDR_NETWORK_REVERT_SNAPSHOT_EVENT, () => {
            eventEmitted = true;
            resolve();
          });
        });

        await provider.request({
          method: "evm_revert",
          params: ["0x1"], // if the snapshotId does not exist, it will return false
        });

        await eventPromise;

        assert.ok(eventEmitted, "The evm_revert event should be emitted");
      },
    );

    it("should return the expected response when the method is web3_clientVersion", async () => {
      const { provider } = await hre.network.connect();

      const response = await provider.request({
        method: "web3_clientVersion",
      });

      assert.ok(
        typeof response === "string",
        "The client version should be a string",
      );
      assert.match(response, /HardhatNetwork\/.+\/@ignored\/edr-optimism\/.+/);
    });

    it("should return the expected response when the method is debug_traceTransaction", async () => {
      const { provider } = await hre.network.connect();

      const accounts = await provider.request({
        method: "eth_accounts",
      });

      assert.ok(Array.isArray(accounts), "Accounts should be an array");
      assert.ok(accounts.length > 0, "There should be at least one account");

      const sender = accounts[0];

      const tx = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: sender,
            to: sender,
            value: "0x1",
          },
        ],
      });

      const response = await provider.request({
        method: "debug_traceTransaction",
        params: [tx],
      });

      assert.deepEqual(response, {
        failed: false,
        gas: 21000,
        returnValue: "",
        structLogs: [],
      });
    });

    it("should return the expected response when the method is debug_traceCall", async () => {
      const { provider } = await hre.network.connect();

      const accounts = await provider.request({
        method: "eth_accounts",
      });

      assert.ok(Array.isArray(accounts), "Accounts should be an array");
      assert.ok(accounts.length > 0, "There should be at least one account");

      const sender = accounts[0];

      await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: sender,
            to: sender,
            value: "0x1",
          },
        ],
      });

      const response = await provider.request({
        method: "debug_traceCall",
        params: [
          {
            to: sender,
          },
        ],
      });

      assert.deepEqual(response, {
        failed: false,
        gas: 21000,
        returnValue: "",
        structLogs: [],
      });
    });

    it("should throw a ProviderError if the params are invalid", async () => {
      const { provider } = await hre.network.connect();

      try {
        await provider.request({
          method: "eth_sendTransaction",
          params: [],
        });
      } catch (error) {
        assert.ok(
          ProviderError.isProviderError(error),
          "Error is not a ProviderError",
        );
        assert.equal(error.code, InvalidArgumentsError.CODE);
        return;
      }
      assert.fail("Function did not throw any error");
    });

    it("should throw a ProviderError for any other type of failed response", async () => {
      const { provider } = await hre.network.connect();

      const accounts = await provider.request({
        method: "eth_accounts",
      });

      assert.ok(Array.isArray(accounts), "Accounts should be an array");
      assert.ok(accounts.length > 0, "There should be at least one account");

      const sender = accounts[0];

      try {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: sender,
              to: sender,
              value: "0xffffffffffffffffffffff",
            },
          ],
        });
      } catch (error) {
        assert.ok(
          ProviderError.isProviderError(error),
          "Error is not a ProviderError",
        );
        return;
      }
      assert.fail("Function did not throw any error");
    });
  });

  describe("EdrProvider#onSubscriptionEvent", () => {
    it(
      "should emit notification and message events for each result of the SubscriptionEvent",
      { timeout: 1000 },
      async () => {
        const event: SubscriptionEvent = {
          filterId: 1n,
          result: ["0x1", "0x2"],
        };
        const eventResultLength = event.result.length;
        const notificationEventResults: string[] = [];
        const messageEventResults: string[] = [];

        const { provider } = await hre.network.connect();

        const notificationEventPromise = new Promise<void>((resolve) => {
          provider.on("notification", ({ result }) => {
            notificationEventResults.push(result);
            if (notificationEventResults.length === eventResultLength) {
              resolve();
            }
          });
        });

        const messageEventPromise = new Promise<void>((resolve) => {
          provider.on("message", ({ data: { result } }) => {
            messageEventResults.push(result);
            if (messageEventResults.length === eventResultLength) {
              resolve();
            }
          });
        });

        assert.ok(
          provider instanceof EdrProvider,
          "Provider is not an EdrProvider",
        );

        provider.onSubscriptionEvent(event);

        await Promise.all([notificationEventPromise, messageEventPromise]);

        // Sort results as they can be emitted in any order
        notificationEventResults.sort();
        messageEventResults.sort();

        assert.deepEqual(notificationEventResults, event.result);
        assert.deepEqual(messageEventResults, event.result);
      },
    );
  });

  describe("EdrProvider#close", () => {
    it("should not allow to make requests after closing", async () => {
      const connection = await hre.network.connect();

      await connection.provider.close();

      await assertRejectsWithHardhatError(
        connection.provider.request({
          method: "eth_chainId",
        }),
        HardhatError.ERRORS.CORE.NETWORK.PROVIDER_CLOSED,
        {},
      );
    });
  });

  describe("isDefaultEdrNetworkHDAccountsConfig", () => {
    let defaultAccounts: EdrNetworkHDAccountsConfig;

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
    });

    it("should correctly detect the default EDR accounts", async () => {
      assert.ok(
        await isDefaultEdrNetworkHDAccountsConfig(defaultAccounts),
        "The default accounts should be detected as default",
      );
    });

    it("should not recognize the default EDR accounts with a different mnemonic as default", async () => {
      const accounts = {
        ...defaultAccounts,
        mnemonic: new FixedValueConfigurationVariable(
          "non default mnemonic non default mnemonic non default mnemonic non default mnemonic",
        ),
      };
      assert.ok(
        !(await isDefaultEdrNetworkHDAccountsConfig(accounts)),
        "The accounts with a different mnemonic should not be detected as default",
      );
    });

    it("should not recognize the default EDR accounts with a different passphrase as default", async () => {
      const accounts = {
        ...defaultAccounts,
        passphrase: new FixedValueConfigurationVariable(
          "non default passphrase",
        ),
      };
      assert.ok(
        !(await isDefaultEdrNetworkHDAccountsConfig(accounts)),
        "The accounts with a different passphrase should not be detected as default",
      );
    });

    it("should not recognize the default EDR accounts with a different path as default", async () => {
      const accounts = {
        ...defaultAccounts,
        path: defaultAccounts.path + "/0",
      };
      assert.ok(
        !(await isDefaultEdrNetworkHDAccountsConfig(accounts)),
        "The accounts with a different path should not be detected as default",
      );
    });

    it("should not recognize the default EDR accounts with a different initialIndex as default", async () => {
      const accounts = {
        ...defaultAccounts,
        initialIndex: defaultAccounts.initialIndex + 1,
      };
      assert.ok(
        !(await isDefaultEdrNetworkHDAccountsConfig(accounts)),
        "The accounts with a different initialIndex should not be detected as default",
      );
    });

    it("should not recognize the default EDR accounts with a different count as default", async () => {
      const accounts = {
        ...defaultAccounts,
        count: defaultAccounts.count + 1,
      };
      assert.ok(
        !(await isDefaultEdrNetworkHDAccountsConfig(accounts)),
        "The accounts with a different count should not be detected as default",
      );
    });
  });
});
