import type {
  ConfigurationVariableResolver,
  EdrNetworkMiningUserConfig,
  EdrNetworkUserConfig,
  HttpNetworkUserConfig,
} from "../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { bytesToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { configVariable } from "../../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../../../../src/internal/builtin-plugins/network-manager/accounts/constants.js";
import {
  resolveChains,
  resolveCoinbase,
  resolveEdrNetwork,
  resolveEdrNetworkAccounts,
  resolveForkingConfig,
  resolveGasConfig,
  resolveHardfork,
  resolveHttpNetwork,
  resolveHttpNetworkAccounts,
  resolveInitialBaseFeePerGas,
  resolveMiningConfig,
  resolveNetworkConfigOverride,
} from "../../../../src/internal/builtin-plugins/network-manager/config-resolution.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";
import {
  HardforkName,
  LATEST_HARDFORK,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  isEdrNetworkForkingConfig,
  isEdrNetworkHdAccountsConfig,
  isEdrNetworkMiningConfig,
  isHttpNetworkHdAccountsConfig,
} from "../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import { L1_CHAIN_TYPE } from "../../../../src/internal/constants.js";
import { resolveConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

describe("config-resolution", () => {
  let hre: HardhatRuntimeEnvironment;
  let configVarResolver: ConfigurationVariableResolver;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
    configVarResolver = (varOrStr) =>
      resolveConfigurationVariable(hre.hooks, varOrStr);
  });

  describe("resolveHttpNetwork", () => {
    it("should return the http network config if it is provided", () => {
      const userConfig: HttpNetworkUserConfig = {
        type: "http",
        chainId: 1,
        chainType: L1_CHAIN_TYPE,
        from: "0x1234",
        gasMultiplier: 2,
        url: "http://localhost:8545",
        timeout: 30_000,
        httpHeaders: { "X-Header": "value" },
      };
      const httpNetworkConfig = resolveHttpNetwork(
        userConfig,
        configVarResolver,
      );

      // Only check the fields that are resolved by the function itself
      // Other fields are checked in the following describe blocks
      assert.equal(httpNetworkConfig.type, userConfig.type);
      assert.equal(httpNetworkConfig.chainId, userConfig.chainId);
      assert.equal(httpNetworkConfig.chainType, userConfig.chainType);
      assert.equal(httpNetworkConfig.from, userConfig.from);
      assert.equal(httpNetworkConfig.gasMultiplier, userConfig.gasMultiplier);
      assert.equal(httpNetworkConfig.timeout, userConfig.timeout);
      assert.deepEqual(httpNetworkConfig.httpHeaders, userConfig.httpHeaders);
    });

    it("should use the default values for the optional fields if they are not provided", () => {
      const userConfig: HttpNetworkUserConfig = {
        type: "http",
        url: "http://localhost:8545",
      };
      const httpNetworkConfig = resolveHttpNetwork(
        userConfig,
        configVarResolver,
      );

      // Only check the fields that are resolved by the function itself
      // Other fields are checked in the following describe blocks
      assert.equal(httpNetworkConfig.type, "http");
      assert.equal(httpNetworkConfig.chainId, undefined);
      assert.equal(httpNetworkConfig.chainType, undefined);
      assert.equal(httpNetworkConfig.from, undefined);
      assert.equal(httpNetworkConfig.gasMultiplier, 1);
      assert.equal(httpNetworkConfig.timeout, 20_000);
      assert.deepEqual(httpNetworkConfig.httpHeaders, {});
    });
  });

  describe("resolveEdrNetwork", () => {
    it("should return the edr network config if it is provided", () => {
      const userConfig: EdrNetworkUserConfig = {
        type: "edr",
        chainId: 1,
        chainType: L1_CHAIN_TYPE,
        from: "0x1234",
        gasMultiplier: 2,
        allowBlocksWithSameTimestamp: true,
        allowUnlimitedContractSize: true,
        blockGasLimit: 20_000_000,
        enableRip7212: true,
        enableTransientStorage: true,
        initialDate: new Date(),
        loggingEnabled: true,
        minGasPrice: 10,
        networkId: 5,
        throwOnCallFailures: false,
        throwOnTransactionFailures: false,
      };
      const edrNetworkConfig = resolveEdrNetwork(
        userConfig,
        "",
        configVarResolver,
      );

      // Only check the fields that are resolved by the function itself
      // Other fields are checked in the following describe blocks
      assert.equal(edrNetworkConfig.type, userConfig.type);
      assert.equal(edrNetworkConfig.chainId, userConfig.chainId);
      assert.equal(edrNetworkConfig.chainType, userConfig.chainType);
      assert.equal(edrNetworkConfig.from, userConfig.from);
      assert.equal(edrNetworkConfig.gasMultiplier, userConfig.gasMultiplier);
      assert.equal(
        edrNetworkConfig.allowBlocksWithSameTimestamp,
        userConfig.allowBlocksWithSameTimestamp,
      );
      assert.equal(
        edrNetworkConfig.allowUnlimitedContractSize,
        userConfig.allowUnlimitedContractSize,
      );
      assert.equal(
        edrNetworkConfig.blockGasLimit,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- cast for testing
        BigInt(userConfig.blockGasLimit as number),
      );
      assert.equal(edrNetworkConfig.enableRip7212, userConfig.enableRip7212);
      assert.equal(
        edrNetworkConfig.enableTransientStorage,
        userConfig.enableTransientStorage,
      );
      assert.equal(edrNetworkConfig.initialDate, userConfig.initialDate);
      assert.equal(edrNetworkConfig.loggingEnabled, userConfig.loggingEnabled);
      assert.equal(
        edrNetworkConfig.minGasPrice,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- cast for testing
        BigInt(userConfig.minGasPrice as number),
      );
      assert.equal(edrNetworkConfig.networkId, userConfig.networkId);
      assert.equal(
        edrNetworkConfig.throwOnCallFailures,
        userConfig.throwOnCallFailures,
      );
      assert.equal(
        edrNetworkConfig.throwOnTransactionFailures,
        userConfig.throwOnTransactionFailures,
      );
    });

    it("should use the default values for the optional fields if they are not provided", () => {
      const userConfig: EdrNetworkUserConfig = {
        type: "edr",
      };
      const now = new Date();
      const edrNetworkConfig = resolveEdrNetwork(
        userConfig,
        "",
        configVarResolver,
      );

      // Only check the fields that are resolved by the function itself
      // Other fields are checked in the following describe blocks
      assert.equal(edrNetworkConfig.type, "edr");
      assert.equal(edrNetworkConfig.chainId, 31337);
      assert.equal(edrNetworkConfig.chainType, undefined);
      assert.equal(edrNetworkConfig.from, undefined);
      assert.equal(edrNetworkConfig.gasMultiplier, 1);
      assert.equal(edrNetworkConfig.allowBlocksWithSameTimestamp, false);
      assert.equal(edrNetworkConfig.allowUnlimitedContractSize, false);
      assert.equal(edrNetworkConfig.blockGasLimit, 30_000_000n);
      assert.equal(edrNetworkConfig.enableRip7212, false);
      assert.equal(edrNetworkConfig.enableTransientStorage, false);
      const initialDate = new Date(edrNetworkConfig.initialDate);
      assert.ok(
        Math.abs(initialDate.getTime() - now.getTime()) < 1000,
        "initialDate is not being set to the current time by default",
      );
      assert.equal(edrNetworkConfig.loggingEnabled, false);
      assert.equal(edrNetworkConfig.minGasPrice, 0n);
      assert.equal(edrNetworkConfig.networkId, 31337);
      assert.equal(edrNetworkConfig.throwOnCallFailures, true);
      assert.equal(edrNetworkConfig.throwOnTransactionFailures, true);
    });

    it("should use the provided chainId for the networkId if it is not provided", () => {
      const userConfig: EdrNetworkUserConfig = {
        type: "edr",
        chainId: 1,
      };
      const edrNetworkConfig = resolveEdrNetwork(
        userConfig,
        "",
        configVarResolver,
      );

      assert.equal(edrNetworkConfig.networkId, userConfig.chainId);
    });
  });

  describe("resolveNetworkConfigOverride", () => {
    it("should resolve to an http network with only the provided fields", async () => {
      const userConfig: HttpNetworkUserConfig = {
        type: "http",
        url: "http://localhost:8545",
        timeout: 25_000,
      };
      const networkConfig = resolveNetworkConfigOverride(
        userConfig,
        configVarResolver,
      );
      assert.equal(Object.keys(networkConfig).length, 3);
      assert.equal(networkConfig.type, userConfig.type);
      assert.equal(await networkConfig.url?.getUrl(), userConfig.url);
      assert.equal(networkConfig.timeout, userConfig.timeout);
    });

    it("should resolve to an edr network with only the provided fields", async () => {
      const userConfig: EdrNetworkUserConfig = {
        type: "edr",
        blockGasLimit: 40_000_000,
        forking: {
          enabled: true,
          url: "http://localhost:8545",
          httpHeaders: { "X-Header": "value" },
        },
      };
      const networkConfig = resolveNetworkConfigOverride(
        userConfig,
        configVarResolver,
      );
      assert.equal(Object.keys(networkConfig).length, 3);
      assert.equal(networkConfig.type, userConfig.type);
      assert.equal(networkConfig.blockGasLimit, 40_000_000n);
      assert.ok(networkConfig.forking !== undefined, "forking is not defined");
      assert.equal(Object.keys(networkConfig.forking).length, 3);
      assert.equal(networkConfig.forking.enabled, true);
      assert.equal(
        await networkConfig.forking.url.getUrl(),
        "http://localhost:8545",
      );
      assert.deepEqual(networkConfig.forking.httpHeaders, {
        "X-Header": "value",
      });
    });
  });

  describe("resolveGasConfig", () => {
    it("should return auto if auto is provided", () => {
      const gasConfig = resolveGasConfig("auto");
      assert.equal(gasConfig, "auto");
    });

    it("should return a bigint if a number is provided", () => {
      const gasConfig = resolveGasConfig(100);
      assert.equal(gasConfig, 100n);
    });

    it("should return a bigint if a bigint is provided", () => {
      const gasConfig = resolveGasConfig(100n);
      assert.equal(gasConfig, 100n);
    });

    it("should return the default gas config if no value is provided", () => {
      const gasConfig = resolveGasConfig();
      assert.equal(gasConfig, "auto");
    });
  });

  describe("resolveHttpNetworkAccounts", () => {
    it("should return an array of normalized accounts if an array of accounts is provided", async () => {
      const accounts = resolveHttpNetworkAccounts(
        ["0x1234", "5678", configVariable("TEST_PK")],
        configVarResolver,
      );

      process.env.TEST_PK = "9012";

      assert.ok(Array.isArray(accounts), "accounts is not an array");
      assert.equal(accounts.length, 3);
      assert.equal(await accounts[0].get(), "0x1234");
      assert.equal(await accounts[1].get(), "0x5678");
      assert.equal(await accounts[2].getHexString(), "0x9012");
    });

    describe("when an object is provided", () => {
      it("should return an HttpNetworkHDAccountsConfig if an object is provided", async () => {
        const userHdAccount = {
          mnemonic:
            "junk test junk test junk test junk test junk test junk test",
          count: 1,
          initialIndex: 1,
          passphrase: "passphrase",
          path: "m/44'/60'/1'/0",
        };
        const accounts = resolveHttpNetworkAccounts(
          userHdAccount,
          configVarResolver,
        );

        assert.ok(
          isHttpNetworkHdAccountsConfig(accounts),
          "accounts is not an HttpNetworkHDAccountsConfig",
        );
        assert.equal(await accounts.mnemonic.get(), userHdAccount.mnemonic);
        assert.equal(accounts.count, userHdAccount.count);
        assert.equal(accounts.initialIndex, userHdAccount.initialIndex);
        assert.equal(accounts.path, userHdAccount.path);
        assert.equal(await accounts.passphrase.get(), userHdAccount.passphrase);
      });

      it("should use the default values for the optional fields if they are not provided", async () => {
        const userHdAccount = {
          mnemonic:
            "junk test junk test junk test junk test junk test junk test",
        };
        const accounts = resolveHttpNetworkAccounts(
          userHdAccount,
          configVarResolver,
        );

        assert.ok(
          isHttpNetworkHdAccountsConfig(accounts),
          "accounts is not an HttpNetworkHDAccountsConfig",
        );
        assert.equal(await accounts.mnemonic.get(), userHdAccount.mnemonic);
        assert.equal(accounts.count, DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS.count);
        assert.equal(
          accounts.initialIndex,
          DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS.initialIndex,
        );
        assert.equal(accounts.path, DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS.path);
        assert.equal(
          await accounts.passphrase.get(),
          DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS.passphrase,
        );
      });
    });

    it("should return remote if remote is provided", () => {
      const accounts = resolveHttpNetworkAccounts("remote", configVarResolver);
      assert.equal(accounts, "remote");
    });

    it("should return the default accounts config if no value is provided", () => {
      const accounts = resolveHttpNetworkAccounts(undefined, configVarResolver);
      assert.equal(accounts, "remote");
    });
  });

  describe("resolveEdrNetworkAccounts", () => {
    it("should return an array of normalized accounts if an array of accounts is provided", async () => {
      const accounts = resolveEdrNetworkAccounts(
        [
          { privateKey: "0x1234", balance: 0n },
          { privateKey: "5678", balance: "1" },
          { privateKey: configVariable("TEST_PK"), balance: 1n },
        ],
        configVarResolver,
      );

      process.env.TEST_PK = "9012";

      assert.ok(Array.isArray(accounts), "accounts is not an array");
      assert.equal(accounts.length, 3);
      assert.equal(await accounts[0].privateKey.get(), "0x1234");
      assert.equal(accounts[0].balance, 0n);
      assert.equal(await accounts[1].privateKey.get(), "0x5678");
      assert.equal(accounts[1].balance, 1n);
      assert.equal(await accounts[2].privateKey.getHexString(), "0x9012");
      assert.equal(accounts[2].balance, 1n);
    });

    describe("when an object is provided", () => {
      it("should return an EdrNetworkHDAccountsConfig if an object is provided", async () => {
        const userHdAccount = {
          mnemonic:
            "junk test junk test junk test junk test junk test junk test",
          accountsBalance: "100",
          count: 1,
          initialIndex: 1,
          passphrase: "passphrase",
          path: "m/44'/60'/1'/0",
        };
        const accounts = resolveEdrNetworkAccounts(
          userHdAccount,
          configVarResolver,
        );

        assert.ok(
          isEdrNetworkHdAccountsConfig(accounts),
          "accounts is not an EdrNetworkHDAccountsConfig",
        );
        assert.equal(await accounts.mnemonic.get(), userHdAccount.mnemonic);
        assert.equal(
          accounts.accountsBalance,
          BigInt(userHdAccount.accountsBalance),
        );
        assert.equal(accounts.count, userHdAccount.count);
        assert.equal(accounts.initialIndex, userHdAccount.initialIndex);
        assert.equal(accounts.path, userHdAccount.path);
        assert.equal(await accounts.passphrase.get(), userHdAccount.passphrase);
      });

      it("should use the default values for the optional fields if they are not provided", async () => {
        const accounts = resolveEdrNetworkAccounts({}, configVarResolver);

        assert.ok(
          isEdrNetworkHdAccountsConfig(accounts),
          "accounts is not an EdrNetworkHDAccountsConfig",
        );
        assert.equal(
          await accounts.mnemonic.get(),
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.mnemonic,
        );
        assert.equal(
          accounts.accountsBalance,
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.accountsBalance,
        );
        assert.equal(
          accounts.count,
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.count,
        );
        assert.equal(
          accounts.initialIndex,
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.initialIndex,
        );
        assert.equal(
          accounts.path,
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.path,
        );
        assert.equal(
          await accounts.passphrase.get(),
          DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.passphrase,
        );
      });
    });

    it("should return the default accounts config if no value is provided", async () => {
      const accounts = resolveEdrNetworkAccounts(undefined, configVarResolver);

      assert.ok(
        isEdrNetworkHdAccountsConfig(accounts),
        "accounts is not an EdrNetworkHDAccountsConfig",
      );
      assert.equal(
        await accounts.mnemonic.get(),
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.mnemonic,
      );
      assert.equal(
        accounts.accountsBalance,
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.accountsBalance,
      );
      assert.equal(
        accounts.count,
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.count,
      );
      assert.equal(
        accounts.initialIndex,
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.initialIndex,
      );
      assert.equal(
        accounts.path,
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.path,
      );
      assert.equal(
        await accounts.passphrase.get(),
        DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS.passphrase,
      );
    });
  });

  describe("resolveForkingConfig", () => {
    it("should return the forking config if it is provided", async () => {
      const userForkingConfig = {
        enabled: true,
        url: "http://localhost:8545",
        blockNumber: 1234,
        httpHeaders: { "X-Header": "value" },
      };
      const cacheDir = "cache-dir";
      const forkingConfig = resolveForkingConfig(
        userForkingConfig,
        cacheDir,
        configVarResolver,
      );

      assert.ok(
        isEdrNetworkForkingConfig(forkingConfig),
        "forkingConfig is not an EdrNetworkForkingConfig",
      );
      assert.equal(forkingConfig.enabled, userForkingConfig.enabled);
      assert.equal(await forkingConfig.url.getUrl(), userForkingConfig.url);
      assert.equal(
        forkingConfig.blockNumber,
        BigInt(userForkingConfig.blockNumber),
      );
      assert.equal(
        forkingConfig.cacheDir,
        path.join(cacheDir, "edr-fork-cache"),
      );
    });

    it("should use the default values for the optional fields if they are not provided", async () => {
      const userForkingConfig = {
        url: "http://localhost:8545",
      };
      const cacheDir = "cache-dir";
      const forkingConfig = resolveForkingConfig(
        userForkingConfig,
        cacheDir,
        configVarResolver,
      );

      assert.ok(
        isEdrNetworkForkingConfig(forkingConfig),
        "forkingConfig is not an EdrNetworkForkingConfig",
      );
      assert.equal(forkingConfig.enabled, true);
      assert.equal(await forkingConfig.url.getUrl(), "http://localhost:8545");
      assert.equal(forkingConfig.blockNumber, undefined);
      assert.equal(
        forkingConfig.cacheDir,
        path.join(cacheDir, "edr-fork-cache"),
      );
      assert.equal(forkingConfig.httpHeaders, undefined);
    });

    it("should return the default forking config if no value is provided", () => {
      const forkingConfig = resolveForkingConfig(
        undefined,
        "cache-dir",
        configVarResolver,
      );

      assert.equal(forkingConfig, undefined);
    });
  });

  describe("resolveMiningConfig", () => {
    it("should return the mining config if it is provided", () => {
      const userMiningConfig: EdrNetworkMiningUserConfig = {
        auto: true,
        interval: [1, 2],
        mempool: {
          order: "fifo",
        },
      };
      const miningConfig = resolveMiningConfig(userMiningConfig);

      assert.ok(
        isEdrNetworkMiningConfig(miningConfig),
        "miningConfig is not an EdrNetworkMiningConfig",
      );
      assert.equal(miningConfig.auto, userMiningConfig.auto);
      assert.equal(miningConfig.interval, userMiningConfig.interval);
      assert.equal(miningConfig.mempool.order, userMiningConfig.mempool?.order);
    });

    it("should return the default mining config if no value is provided", () => {
      let miningConfig = resolveMiningConfig(undefined);

      assert.ok(
        isEdrNetworkMiningConfig(miningConfig),
        "miningConfig is not an EdrNetworkMiningConfig",
      );
      // when auto is not provided, it depends on the interval being set or not
      assert.equal(miningConfig.auto, true);
      assert.equal(miningConfig.interval, 0);
      assert.equal(miningConfig.mempool.order, "priority");

      miningConfig = resolveMiningConfig({ interval: 1 });

      assert.ok(
        isEdrNetworkMiningConfig(miningConfig),
        "miningConfig is not an EdrNetworkMiningConfig",
      );
      // when auto is not provided, it depends on the interval being set or not
      assert.equal(miningConfig.auto, false);
      assert.equal(miningConfig.interval, 1);
      assert.equal(miningConfig.mempool.order, "priority");
    });
  });

  describe("resolveCoinbase", () => {
    it("should return the coinbase converted to bytes if it is provided", () => {
      const coinbase = resolveCoinbase("0x1234");
      assert.equal(bytesToHexString(coinbase), "0x1234");
    });

    it("should return the default coinbase if no value is provided", () => {
      const coinbase = resolveCoinbase(undefined);
      assert.equal(bytesToHexString(coinbase), EDR_NETWORK_DEFAULT_COINBASE);
    });
  });

  describe("resolveChains", () => {
    it("should return the resolved chains with the provided chains overriding the defaults", () => {
      const chainsUserConfig = new Map([
        [
          1,
          {
            hardforkHistory: new Map([
              [HardforkName.BYZANTIUM, 1],
              [HardforkName.CONSTANTINOPLE, 2],
              ["newHardfork", 3],
            ]),
          },
        ],
        [
          31337,
          {
            hardforkHistory: new Map([[HardforkName.BYZANTIUM, 1]]),
          },
        ],
      ]);
      const chainsConfig = resolveChains(chainsUserConfig);

      const mainnet = chainsConfig.get(1);
      assert.ok(mainnet !== undefined, "chain 1 is not in the resolved chains");
      assert.equal(mainnet.hardforkHistory.get(HardforkName.BYZANTIUM), 1);
      assert.equal(mainnet.hardforkHistory.get(HardforkName.CONSTANTINOPLE), 2);
      assert.equal(mainnet.hardforkHistory.get("newHardfork"), 3);

      const myNetwork = chainsConfig.get(31337);
      assert.ok(
        myNetwork !== undefined,
        "chain 31337 is not in the resolved chains",
      );
      assert.equal(myNetwork.hardforkHistory.get(HardforkName.BYZANTIUM), 1);
    });

    it("should return the default chains if no chains are provided", () => {
      const chainsConfig = resolveChains(undefined);

      // Check some of the default values
      const mainnet = chainsConfig.get(1);
      assert.ok(mainnet !== undefined, "chain 1 is not in the resolved chains");
      assert.equal(
        mainnet.hardforkHistory.get(HardforkName.BYZANTIUM),
        4_370_000,
      );
      assert.equal(
        mainnet.hardforkHistory.get(HardforkName.CONSTANTINOPLE),
        7_280_000,
      );
      assert.equal(
        mainnet.hardforkHistory.get(HardforkName.SHANGHAI),
        17_034_870,
      );
      assert.equal(
        mainnet.hardforkHistory.get(HardforkName.CANCUN),
        19_426_589,
      );
      const myNetwork = chainsConfig.get(31337);
      assert.ok(
        myNetwork === undefined,
        "chain 31337 is in the resolved chains",
      );
    });
  });

  describe("resolveHardfork", () => {
    it("should return the hardfork if it is provided", () => {
      let hardfork = resolveHardfork(HardforkName.LONDON, true);
      assert.equal(hardfork, HardforkName.LONDON);

      hardfork = resolveHardfork(HardforkName.LONDON, false);
      assert.equal(hardfork, HardforkName.LONDON);
    });

    it("should return the latest hardfork if no hardfork is provided and transientStorage is enabled", () => {
      const hardfork = resolveHardfork(undefined, true);
      assert.equal(hardfork, LATEST_HARDFORK);
    });

    it("should return shanghai if no hardfork is provided and transientStorage is disabled", () => {
      const hardfork = resolveHardfork(undefined, false);
      assert.equal(hardfork, HardforkName.SHANGHAI);
    });
  });

  describe("resolveInitialBaseFeePerGas", () => {
    it("should return the initialBaseFeePerGas if it is provided as a number", () => {
      const initialBaseFeePerGas = resolveInitialBaseFeePerGas(100);
      assert.equal(initialBaseFeePerGas, 100n);
    });

    it("should return the initialBaseFeePerGas if it is provided as a bigint", () => {
      const initialBaseFeePerGas = resolveInitialBaseFeePerGas(100n);
      assert.equal(initialBaseFeePerGas, 100n);
    });

    it("should return the default initialBaseFeePerGas if no value is provided", () => {
      const initialBaseFeePerGas = resolveInitialBaseFeePerGas(undefined);
      assert.equal(initialBaseFeePerGas, undefined);
    });
  });
});
