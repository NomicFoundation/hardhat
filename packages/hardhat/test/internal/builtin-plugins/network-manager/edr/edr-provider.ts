import type {
  EdrNetworkConfigOverride,
  EdrNetworkHDAccountsConfig,
} from "../../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type {
  LocalConfig,
  ProviderConfig,
  SubscriptionEvent,
} from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { once } from "node:events";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { GasEstimationMode } from "@nomicfoundation/edr";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import {
  hexStringToNumber,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  isDefaultEdrNetworkHDAccountsConfig,
} from "../../../../../src/internal/builtin-plugins/network-manager/edr/edr-constants.js";
import {
  EdrProvider,
  getProviderConfig,
} from "../../../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";
import { L1HardforkName } from "../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  InternalCallOutOfGasError,
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
      const { provider } = await hre.network.create();

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
        const { provider } = await hre.network.create();

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
      const { provider } = await hre.network.create();

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
        returnValue: "0x",
        structLogs: [],
      });
    });

    it("should return the expected response when the method is debug_traceCall", async () => {
      const { provider } = await hre.network.create();

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
        returnValue: "0x",
        structLogs: [],
      });
    });

    it("should throw a ProviderError if the params are invalid", async () => {
      const { provider } = await hre.network.create();

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
      const { provider } = await hre.network.create();

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

    describe("gas estimation of transactions with internal out-of-gas calls", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      // Runtime bytecode that CALLs itself with a fixed gas of 100. The
      // inner frame always runs out of gas, while the outer frame ignores
      // the result of the call and succeeds.
      const alwaysInternalOogCode = "0x60006000600060006000306064f15000";

      async function connectWithAlwaysInternalOogContract(
        override?: EdrNetworkConfigOverride,
      ) {
        const { provider } = await hre.network.create({ override });

        await provider.request({
          method: "hardhat_setCode",
          params: [contractAddress, alwaysInternalOogCode],
        });

        const accounts = await provider.request({
          method: "eth_accounts",
        });

        assertHardhatInvariant(
          Array.isArray(accounts) && typeof accounts[0] === "string",
          "There should be at least one account",
        );

        return { provider, sender: accounts[0] };
      }

      it("should throw an InternalCallOutOfGasError in the default estimation mode (noInternalOutOfGas)", async () => {
        const { provider, sender } =
          await connectWithAlwaysInternalOogContract();

        try {
          await provider.request({
            method: "eth_estimateGas",
            params: [{ from: sender, to: contractAddress }],
          });
        } catch (error) {
          assert.ok(
            error instanceof InternalCallOutOfGasError,
            "Error is not an InternalCallOutOfGasError",
          );
          assert.equal(error.code, InternalCallOutOfGasError.CODE);
          assert.match(error.message, /internal call runs out of gas/);
          assert.ok(
            typeof error.data === "object" &&
              error.data !== null &&
              "reason" in error.data &&
              error.data.reason === "InternalCallOutOfGas",
            "The error data should contain the InternalCallOutOfGas reason",
          );
          return;
        }
        assert.fail("Function did not throw any error");
      });

      it("should return an estimation when gasEstimationMode is topLevelSuccess", async () => {
        const { provider, sender } = await connectWithAlwaysInternalOogContract(
          {
            gasEstimationMode: "topLevelSuccess",
          },
        );

        const estimation = await provider.request({
          method: "eth_estimateGas",
          params: [{ from: sender, to: contractAddress }],
        });

        assertHardhatInvariant(
          typeof estimation === "string",
          "The estimation should be a string",
        );

        // The estimation only needs to cover the top-level call, so it
        // should be close to the base transaction cost.
        assert.ok(
          hexStringToNumber(estimation) >= 21_000,
          "The estimation should cover the base transaction cost",
        );
      });

      it("should fall back to the default transaction gas limit for transactions with automatic gas", async () => {
        const { provider, sender } =
          await connectWithAlwaysInternalOogContract();

        // The network uses gas: "auto" and the default estimation mode
        // (noInternalOutOfGas), so the gas estimation runs as part of the
        // eth_sendTransaction request. The estimation fails because of the
        // internal out-of-gas error, and the default transaction gas limit
        // is used instead: the EIP-7825 cap, as the default hardfork is
        // osaka or later.
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: sender, to: contractAddress }],
        });

        const tx = await provider.request({
          method: "eth_getTransactionByHash",
          params: [txHash],
        });

        assertHardhatInvariant(
          typeof tx === "object" &&
            tx !== null &&
            "gas" in tx &&
            typeof tx.gas === "string",
          "The transaction should have a gas field",
        );

        assert.equal(hexStringToNumber(tx.gas), 16_777_216);
      });

      it("should cap the automatic gas fallback to a block gas limit lower than the EIP-7825 cap", async () => {
        const { provider, sender } = await connectWithAlwaysInternalOogContract(
          {
            blockGasLimit: 5_000_000,
          },
        );

        // Same fallback as above, but the block gas limit is lower than the
        // EIP-7825 cap: the fallback must not exceed it, or the transaction
        // would be rejected instead of mined.
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: sender, to: contractAddress }],
        });

        const tx = await provider.request({
          method: "eth_getTransactionByHash",
          params: [txHash],
        });

        assertHardhatInvariant(
          typeof tx === "object" &&
            tx !== null &&
            "gas" in tx &&
            typeof tx.gas === "string",
          "The transaction should have a gas field",
        );

        assert.equal(hexStringToNumber(tx.gas), 5_000_000);
      });

      it("should mine a successful transaction whose internal call ran out of gas when gasEstimationMode is topLevelSuccess", async () => {
        const { provider, sender } = await connectWithAlwaysInternalOogContract(
          {
            gasEstimationMode: "topLevelSuccess",
          },
        );

        // The network uses gas: "auto", so the transaction is sent with the
        // topLevelSuccess estimate, which only covers the top-level call.
        // The internal call runs out of gas, but the contract ignores its
        // result, so the transaction still succeeds: this is the silent
        // internal failure that the noInternalOutOfGas mode prevents.
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: sender, to: contractAddress }],
        });

        const receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });

        assertHardhatInvariant(
          typeof receipt === "object" &&
            receipt !== null &&
            "status" in receipt,
          "The receipt should have a status field",
        );

        assert.equal(receipt.status, "0x1");
      });
    });

    describe("eth_getProof", () => {
      const tmp = createTmpDir("edr-provider-eth-getProof", "describe");

      it("should return account proof on local network", async () => {
        const { provider } = await hre.network.create();

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
        const { provider } = await hre.network.create();

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
          paths: { cache: tmp.path },
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

        const { provider } = await forkedHre.network.create("edrOptimism");

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
          paths: { cache: tmp.path },
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

        const { provider } = await forkedHre.network.create("edrOptimism");

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
        // `SubscriptionEvent.result` is typed as `unknown`, so we keep the
        // payload in a typed local to read its length and assert against it.
        const eventResult = ["0x1", "0x2"];
        const event: SubscriptionEvent = {
          filterId: 1n,
          result: eventResult,
        };
        const eventResultLength = eventResult.length;
        const notificationEventResults: string[] = [];
        const messageEventResults: string[] = [];

        const { provider } = await hre.network.create();

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

        assert.deepEqual(notificationEventResults, eventResult);
        assert.deepEqual(messageEventResults, eventResult);
      },
    );
  });

  describe("EdrProvider#close", () => {
    it("should not allow to make requests after closing", async () => {
      const connection = await hre.network.create();

      await connection.provider.close();

      await assertRejectsWithHardhatError(
        connection.provider.request({
          method: "eth_chainId",
        }),
        HardhatError.ERRORS.CORE.NETWORK.PROVIDER_CLOSED,
        {},
      );
    });

    it("should remove all listeners after closing", async () => {
      const connection = await hre.network.create();

      connection.provider.on("notification", () => {});
      assert.equal(connection.provider.listenerCount("notification"), 1);

      await connection.provider.close();

      assert.equal(connection.provider.listenerCount("notification"), 0);
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

  describe("getProviderConfig", () => {
    const tmp = createTmpDir("getProviderConfigTest", "describe");
    let networkConfigStub: Parameters<typeof getProviderConfig>[0];

    before(() => {
      networkConfigStub = {
        type: "edr-simulated",
        chainType: "l1",
        accounts: [],
        allowBlocksWithSameTimestamp: true,
        allowUnlimitedContractSize: true,
        blockGasLimit: 60_000_000n,
        chainId: 31337,
        coinbase: Buffer.from(
          "0000000000000000000000000000000000000000",
          "hex",
        ),
        gas: "auto",
        gasEstimationMode: "noInternalOutOfGas",
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
          cacheDir: tmp.path,
        },
      };
    });

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

      assertHardhatInvariant(
        "url" in providerConfig.network,
        "Expected fork config",
      );
      assert.equal(providerConfig.network.chainOverrides?.length, 2);

      // mainnet doesn't have hardfork history, so it should be undefined
      const mainnetOverride = providerConfig.network.chainOverrides?.[0];
      assert.equal(mainnetOverride.name, "mainnet");
      assert.equal(mainnetOverride.hardforkActivationOverrides, undefined);

      // sepolia has an empty map as hardfork history, so it should be an empty array
      const sepoliaOverride = providerConfig.network.chainOverrides?.[1];
      assert.equal(sepoliaOverride.name, "sepolia");
      assert.deepEqual(sepoliaOverride.hardforkActivationOverrides, []);
    });

    describe("LocalConfig (i.e. non-forking network setup)", () => {
      const initialDate = new Date("2024-01-01T00:00:00Z");
      const blockGasLimit = 42_000_000n;

      let localConfig: LocalConfig;

      before(async () => {
        const providerConfig = await getProviderConfig(
          {
            ...networkConfigStub,
            forking: undefined,
            blockGasLimit,
            initialDate,
          },
          undefined,
          undefined,
          new Map(),
        );

        assertHardhatInvariant(
          !("url" in providerConfig.network),
          "Expected local config",
        );

        localConfig = providerConfig.network;
      });

      it("should map blockGasLimit to EDR genesisBlockGasLimit", async () => {
        assert.equal(localConfig.genesisBlockGasLimit, blockGasLimit);
      });

      it("should map initialDate to EDR genesisBlockTime", async () => {
        assert.equal(
          localConfig.genesisBlockTime,
          BigInt(Math.floor(initialDate.getTime() / 1000)),
        );
      });
    });

    describe("when blockGasLimit is unset", () => {
      let providerConfig: ProviderConfig;

      before(async () => {
        providerConfig = await getProviderConfig(
          {
            ...networkConfigStub,
            forking: undefined,
            blockGasLimit: undefined,
          },
          undefined,
          undefined,
          new Map(),
        );
      });

      it("should default mining.blockGasLimit to 60_000_000n", () => {
        assert.equal(providerConfig.mining.blockGasLimit, 60_000_000n);
      });

      it("should default the LocalConfig genesisBlockGasLimit to 60_000_000n", () => {
        assertHardhatInvariant(
          !("url" in providerConfig.network),
          "Expected local config",
        );
        assert.equal(providerConfig.network.genesisBlockGasLimit, 60_000_000n);
      });
    });

    describe("when blockGasLimit is disabled (false)", () => {
      let providerConfig: ProviderConfig;

      before(async () => {
        providerConfig = await getProviderConfig(
          {
            ...networkConfigStub,
            forking: undefined,
            blockGasLimit: false,
          },
          undefined,
          undefined,
          new Map(),
        );
      });

      it("should omit mining.blockGasLimit to disable enforcement", () => {
        assert.equal(providerConfig.mining.blockGasLimit, undefined);
      });

      it("should still default the LocalConfig genesisBlockGasLimit to 60_000_000n", () => {
        assertHardhatInvariant(
          !("url" in providerConfig.network),
          "Expected local config",
        );
        assert.equal(providerConfig.network.genesisBlockGasLimit, 60_000_000n);
      });
    });

    describe("transactionGasCap", () => {
      it("should omit transactionGasCap when unset (hardfork default applies)", async () => {
        const providerConfig = await getProviderConfig(
          { ...networkConfigStub, transactionGasCap: undefined },
          undefined,
          undefined,
          new Map(),
        );

        assert.equal(providerConfig.transactionGasCap, undefined);
      });

      it("should pass an explicit transactionGasCap bigint through to EDR", async () => {
        const providerConfig = await getProviderConfig(
          { ...networkConfigStub, transactionGasCap: 1_000_000n },
          undefined,
          undefined,
          new Map(),
        );

        assert.equal(providerConfig.transactionGasCap, 1_000_000n);
      });

      it("should pass false through to EDR to disable the cap", async () => {
        const providerConfig = await getProviderConfig(
          { ...networkConfigStub, transactionGasCap: false },
          undefined,
          undefined,
          new Map(),
        );

        assert.equal(providerConfig.transactionGasCap, false);
      });
    });

    describe("gasEstimationMode", () => {
      // The full mode-to-enum mapping is unit tested in convert-to-edr.ts;
      // here we only check that the configured mode reaches EDR, using the
      // non-default value.
      it("should map the configured mode to the EDR enum", async () => {
        const providerConfig = await getProviderConfig(
          { ...networkConfigStub, gasEstimationMode: "topLevelSuccess" },
          undefined,
          undefined,
          new Map(),
        );

        assert.equal(
          providerConfig.gasEstimationMode,
          GasEstimationMode.TopLevelSuccess,
        );
      });
    });
  });

  describe("experimental hardfork warning", () => {
    let originalError: typeof console.error;
    let warnings: string[];

    beforeEach(() => {
      originalError = console.error;
      warnings = [];
      console.error = (...args: unknown[]) => {
        warnings.push(args.map(String).join(" "));
      };
    });

    afterEach(() => {
      console.error = originalError;
    });

    it("warns exactly once when creating a provider with an experimental hardfork", async () => {
      await hre.network.create({
        override: {
          hardfork: L1HardforkName.AMSTERDAM,
        },
      });

      const experimentalWarnings = warnings.filter((w) =>
        w.includes(L1HardforkName.AMSTERDAM),
      );
      assert.equal(experimentalWarnings.length, 1);
    });
  });
});
