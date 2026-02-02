import type {
  EdrNetworkHDAccountsConfig,
  NetworkConfig,
} from "../../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type { RequireField } from "../../../../../src/types/utils.js";
import type { SubscriptionEvent } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { once } from "node:events";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { mkdtemp } from "@nomicfoundation/hardhat-utils/fs";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EdrProvider,
  getProviderConfig,
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
    it("should return the expected response when the method is web3_clientVersion", async () => {
      const { provider } = await hre.network.connect();

      const response = await provider.request({
        method: "web3_clientVersion",
      });

      assert.ok(
        typeof response === "string",
        "The client version should be a string",
      );
      assert.match(response, /HardhatNetwork\/.+\/@nomicfoundation\/edr\/.+/);
    });

    it(
      "should emit an event when the method is evm_revert",
      { timeout: 1000 },
      async () => {
        let eventEmitted = false;
        const { provider } = await hre.network.connect();

        const eventPromise = once(
          provider,
          EDR_NETWORK_REVERT_SNAPSHOT_EVENT,
        ).then(() => {
          eventEmitted = true;
        });

        const revertResponse = await provider.request({
          method: "evm_revert",
          params: ["0x1"],
        });

        // It should return `false` as the id doesn't exist
        assert.equal(revertResponse, false);

        await eventPromise;

        assert.ok(eventEmitted, "The evm_revert event should be emitted");
      },
    );

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

    describe("eth_getProof", () => {
      it("should return account proof on local network", async () => {
        const { provider } = await hre.network.connect();

        const accounts = await provider.request({
          method: "eth_accounts",
        });

        assert.ok(
          Array.isArray(accounts) && accounts.length > 0,
          "Accounts should be a non empty array",
        );

        const account = accounts[0];

        const proof = await provider.request({
          method: "eth_getProof",
          params: [
            account,
            [], // storage keys (empty array)
            "latest",
          ],
        });

        assert.equal(
          proof.address,
          account,
          "Address should match the requested account",
        );

        // Default hardhat accounts have 10_000 ETH
        assert.equal(
          proof.balance,
          numberToHexString(10_000n * 10n ** 18n),
          "Balance should be 10_000 ETH",
        );

        // Check cryptographic proof structure
        assert.ok(
          Array.isArray(proof.accountProof) && proof.accountProof.length > 0,
          "accountProof should be a non empty array",
        );
        assert.ok(
          Array.isArray(proof.storageProof) && proof.storageProof.length === 0,
          // we passed `[]` as storage keys in the request
          "StorageProof should be an empty array for 0 storage keys",
        );
      });

      it("should return storage proof for contract on local network", async () => {
        const { provider } = await hre.network.connect();

        // Define arbitrary address and storage key
        const contractAddress = "0x1234567890123456789012345678901234567890";
        const slotZero =
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        const valueOne =
          "0x0000000000000000000000000000000000000000000000000000000000000001";

        // Set storage directly (bypassing deployment & mining)
        await provider.request({
          method: "hardhat_setStorageAt",
          params: [contractAddress, slotZero, valueOne],
        });

        const proof = await provider.request({
          method: "eth_getProof",
          params: [contractAddress, [slotZero], "latest"],
        });

        assert.equal(proof.address, contractAddress, "Address should match");
        assert.equal(
          proof.storageProof.length,
          1,
          "Should return 1 storage proof",
        );
        assert.equal(
          proof.storageProof[0].key,
          slotZero,
          "Storage key should match",
        );
        assert.equal(
          proof.storageProof[0].value,
          "0x1",
          "Storage value should be 0x1",
        );
        assert.ok(
          proof.storageProof[0].proof.length > 0,
          "Storage proof should not be empty",
        );
      });

      it("should return proof on fork without local changes", async () => {
        // NOTE: Accounts are disabled in the network configuration to prevent local state changes, which would
        // cause eth_getProof to fail with a "proof not supported in fork mode" error.

        const forkedHre = await createHardhatRuntimeEnvironment({
          networks: {
            edrOptimism: {
              type: "edr-simulated",
              chainId: 10,
              chainType: "op",
              // Disable default accounts to prevent local state modification
              accounts: [],
              forking: {
                url: "https://mainnet.optimism.io",
                enabled: true,
              },
            },
          },
        });

        const { provider } = await forkedHre.network.connect("edrOptimism");

        try {
          // WETH Optimism address
          const targetAddress = "0x4200000000000000000000000000000000000006";

          const proof = await provider.request({
            method: "eth_getProof",
            params: [targetAddress, [], "latest"],
          });

          assert.equal(
            proof.address,
            targetAddress,
            "Should return proof for the requested address",
          );
          assert.ok(
            proof.accountProof.length > 0,
            "Should have account proof from remote",
          );
        } finally {
          await provider.close();
        }
      });

      it("should throw error on fork with local changes", async () => {
        // NOTE: Accounts are NOT disabled in the network configuration, so Hardhat modifies the state by
        // injecting default accounts, causing eth_getProof to fail with a
        // "proof not supported in fork mode" error.

        const forkedHre = await createHardhatRuntimeEnvironment({
          networks: {
            edrOptimism: {
              type: "edr-simulated",
              chainId: 10,
              chainType: "op",
              forking: {
                url: "https://mainnet.optimism.io",
                enabled: true,
              },
            },
          },
        });

        const { provider } = await forkedHre.network.connect("edrOptimism");

        try {
          const accounts = await provider.request({ method: "eth_accounts" });
          const sender = accounts[0];

          // We expect this to fail
          await provider.request({
            method: "eth_getProof",
            params: [sender, [], "latest"],
          });
        } catch (error) {
          assert.ok(
            ProviderError.isProviderError(error),
            "Error is not a ProviderError",
          );

          assert.match(
            error.message,
            /proof is not supported in fork mode when local changes have been made/,
            "Error message should explain lack of support for local blocks on fork",
          );

          return;
        } finally {
          await provider.close();
        }

        assert.fail("eth_getProof should have thrown an error");
      });
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

  describe("getProviderConfig", async () => {
    const networkConfigStub: RequireField<NetworkConfig, "chainType"> = {
      type: "edr-simulated",
      chainType: "l1",
      accounts: [],
      allowBlocksWithSameTimestamp: true,
      allowUnlimitedContractSize: true,
      blockGasLimit: 60_000_000n,
      chainId: 31337,
      coinbase: Buffer.from("0000000000000000000000000000000000000000", "hex"),
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      hardfork: "osaka",
      initialDate: new Date(),
      loggingEnabled: false,
      minGasPrice: 0n,
      mining: { auto: true, interval: 0, mempool: { order: "fifo" } },
      networkId: 31337,
      throwOnCallFailures: true,
      throwOnTransactionFailures: true,
      forking: {
        enabled: true,
        url: new FixedValueConfigurationVariable("http://example.com"),
        cacheDir: await mkdtemp("getProviderConfigTest"),
      },
    };

    it("should not include hardfork history if not present in the chain descriptor", async () => {
      const providerConfig = await getProviderConfig(
        networkConfigStub,
        undefined,
        undefined,
        new Map([
          [1n, { name: "mainnet", chainType: "l1", blockExplorers: {} }],
          [
            11155111n,
            {
              name: "sepolia",
              chainType: "l1",
              blockExplorers: {},
              hardforkHistory: new Map(),
            },
          ],
        ]),
      );

      assert.equal(providerConfig.fork?.chainOverrides?.length, 2);

      // mainnet doesn't have harfork history, so it should be undefined
      const mainnetOverride = providerConfig.fork?.chainOverrides[0];
      assert.equal(mainnetOverride.name, "mainnet");
      assert.equal(mainnetOverride.hardforkActivationOverrides, undefined);

      // sepolia has an empty map as hardfork history, so it should be an empty array
      const sepoliaOverride = providerConfig.fork?.chainOverrides[1];
      assert.equal(sepoliaOverride.name, "sepolia");
      assert.deepEqual(sepoliaOverride.hardforkActivationOverrides, []);
    });
  });
});
