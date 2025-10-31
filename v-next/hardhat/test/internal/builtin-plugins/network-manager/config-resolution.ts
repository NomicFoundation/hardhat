import type {
  ConfigurationVariableResolver,
  ChainDescriptorsUserConfig,
  EdrNetworkMiningUserConfig,
  EdrNetworkUserConfig,
  HttpNetworkUserConfig,
  BlockExplorersUserConfig,
} from "../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { configVariable } from "../../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../../../../src/internal/builtin-plugins/network-manager/accounts/constants.js";
import { DEFAULT_CHAIN_DESCRIPTORS } from "../../../../src/internal/builtin-plugins/network-manager/chain-descriptors.js";
import {
  resolveChainDescriptors,
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
} from "../../../../src/internal/builtin-plugins/network-manager/config-resolution.js";
import {
  DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  EDR_NETWORK_DEFAULT_COINBASE,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/edr-provider.js";
import {
  L1HardforkName,
  getCurrentHardfork,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  isEdrNetworkForkingConfig,
  isEdrNetworkHdAccountsConfig,
  isEdrNetworkMiningConfig,
  isHttpNetworkHdAccountsConfig,
} from "../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../src/internal/constants.js";
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
      assert.equal(httpNetworkConfig.timeout, 300_000);
      assert.deepEqual(httpNetworkConfig.httpHeaders, {});
    });
  });

  describe("resolveEdrNetwork", () => {
    it("should return the edr network config if it is provided", () => {
      const userConfig: EdrNetworkUserConfig = {
        type: "edr-simulated",
        chainId: 1,
        chainType: L1_CHAIN_TYPE,
        from: "0x1234",
        gasMultiplier: 2,
        allowBlocksWithSameTimestamp: true,
        allowUnlimitedContractSize: true,
        blockGasLimit: 20_000_000,
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
        type: "edr-simulated",
      };
      const now = new Date();
      const edrNetworkConfig = resolveEdrNetwork(
        userConfig,
        "",
        configVarResolver,
      );

      // Only check the fields that are resolved by the function itself
      // Other fields are checked in the following describe blocks
      assert.equal(edrNetworkConfig.type, "edr-simulated");
      assert.equal(edrNetworkConfig.chainId, 31337);
      assert.equal(edrNetworkConfig.chainType, undefined);
      assert.equal(edrNetworkConfig.from, undefined);
      assert.equal(edrNetworkConfig.gasMultiplier, 1);
      assert.equal(edrNetworkConfig.allowBlocksWithSameTimestamp, false);
      assert.equal(edrNetworkConfig.allowUnlimitedContractSize, false);
      assert.equal(edrNetworkConfig.blockGasLimit, 30_000_000n);
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
        type: "edr-simulated",
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

  describe("resolveChainDescriptors", () => {
    it("should return the resolved chain descriptors with the provided chainDescriptors overriding the defaults", async () => {
      const mainnetChainId = 1;
      const myNetworkChainId = 31_337;
      const chainDescriptorsUserConfig: ChainDescriptorsUserConfig = {
        [mainnetChainId]: {
          name: "Ethereum",
          chainType: GENERIC_CHAIN_TYPE,
          hardforkHistory: {
            [L1HardforkName.BYZANTIUM]: { blockNumber: 1 },
            [L1HardforkName.CONSTANTINOPLE]: { blockNumber: 2 },
            newHardfork: { blockNumber: 3 },
          },
        },
        [myNetworkChainId]: {
          name: "My Network",
          hardforkHistory: {
            [L1HardforkName.BYZANTIUM]: { blockNumber: 1 },
          },
          blockExplorers: {
            etherscan: {
              url: "http://localhost:8545",
              apiUrl: "http://localhost:8545/api",
            },
          },
        },
      };
      const chainDescriptorsConfig = await resolveChainDescriptors(
        chainDescriptorsUserConfig,
      );

      const mainnetUserConfig = chainDescriptorsUserConfig[mainnetChainId];
      const mainnetConfig = chainDescriptorsConfig.get(
        toBigInt(mainnetChainId),
      );
      assert.equal(mainnetConfig?.chainType, mainnetUserConfig?.chainType);
      assert.deepEqual(
        mainnetConfig?.hardforkHistory,
        new Map(Object.entries(mainnetUserConfig?.hardforkHistory ?? {})),
      );

      const myNetworkUserConfig = chainDescriptorsUserConfig[myNetworkChainId];
      const myNetworkConfig = chainDescriptorsConfig.get(
        toBigInt(myNetworkChainId),
      );
      assert.equal(myNetworkConfig?.name, myNetworkUserConfig?.name);
      assert.equal(myNetworkConfig?.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(
        myNetworkConfig?.hardforkHistory,
        new Map(Object.entries(myNetworkUserConfig?.hardforkHistory ?? {})),
      );
      assert.deepEqual(
        myNetworkConfig?.blockExplorers,
        myNetworkUserConfig?.blockExplorers,
      );
    });

    it("should only override the provided fields", async () => {
      const mainnetChainId = 1;
      const sepoliaChainId = 11_155_111;
      const holeskyChainId = 17_000;
      const hoodiChainId = 560_048;

      const chainDescriptorsUserConfig: ChainDescriptorsUserConfig = {
        [mainnetChainId]: {
          name: "Ethereum Mainnet",
          hardforkHistory: {
            [L1HardforkName.BYZANTIUM]: { blockNumber: 1 },
            [L1HardforkName.CONSTANTINOPLE]: { blockNumber: 2 },
            newHardfork: { blockNumber: 3 },
          },
        },
        [sepoliaChainId]: {
          name: "Sepolia Testnet",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- in the real world, BlockExplorersUserConfig would be extended with
          the new block explorer, but for testing purposes we cast it */
          blockExplorers: {
            etherscan: {
              url: undefined,
              apiUrl: "http://localhost:8545/api",
              name: "Etherscan",
            },
            // users can add new block explorers
            customExplorer: {
              apiUrl: "http://custom-explorer.io/api",
              someOtherField: "some value",
            },
          } as BlockExplorersUserConfig,
        },
        [holeskyChainId]: {
          name: "Holesky Testnet",
          chainType: GENERIC_CHAIN_TYPE,
        },
        [hoodiChainId]: {
          name: "Hoodi Testnet",
        },
      };
      const chainDescriptorsConfig = await resolveChainDescriptors(
        chainDescriptorsUserConfig,
      );

      const mainnetUserConfig = chainDescriptorsUserConfig[mainnetChainId];
      const mainnetConfig = chainDescriptorsConfig.get(
        toBigInt(mainnetChainId),
      );
      const mainnetDefault = DEFAULT_CHAIN_DESCRIPTORS.get(
        toBigInt(mainnetChainId),
      );
      assert.equal(mainnetConfig?.name, mainnetUserConfig.name);
      assert.equal(mainnetConfig?.chainType, L1_CHAIN_TYPE);
      assert.deepEqual(
        mainnetConfig?.hardforkHistory,
        new Map(Object.entries(mainnetUserConfig.hardforkHistory ?? {})),
      );
      assert.deepEqual(
        mainnetConfig?.blockExplorers,
        mainnetDefault?.blockExplorers,
      );

      const sepoliaUserConfig = chainDescriptorsUserConfig[sepoliaChainId];
      const sepoliaConfig = chainDescriptorsConfig.get(
        toBigInt(sepoliaChainId),
      );
      const sepoliaDefault = DEFAULT_CHAIN_DESCRIPTORS.get(
        toBigInt(sepoliaChainId),
      );
      assert.equal(sepoliaConfig?.name, sepoliaUserConfig.name);
      assert.equal(sepoliaConfig?.chainType, L1_CHAIN_TYPE);
      assert.deepEqual(
        sepoliaConfig?.hardforkHistory,
        sepoliaDefault?.hardforkHistory,
      );
      assert.deepEqual(
        sepoliaConfig?.blockExplorers.etherscan?.name,
        sepoliaUserConfig.blockExplorers?.etherscan?.name,
      );
      assert.deepEqual(
        sepoliaConfig?.blockExplorers.etherscan?.apiUrl,
        sepoliaUserConfig.blockExplorers?.etherscan?.apiUrl,
      );
      // make sure undefined values are ignored
      assert.deepEqual(
        sepoliaConfig?.blockExplorers.etherscan?.url,
        sepoliaDefault?.blockExplorers?.etherscan?.url,
      );
      assert.deepEqual(
        sepoliaConfig?.blockExplorers.blockscout,
        sepoliaDefault?.blockExplorers.blockscout,
      );
      assert.deepEqual(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- cast to access customExplorer
        (sepoliaConfig?.blockExplorers as any).customExplorer,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- cast to access customExplorer
        (sepoliaUserConfig.blockExplorers as any)?.customExplorer,
      );

      const holeskyUserConfig = chainDescriptorsUserConfig[holeskyChainId];
      const holeskyConfig = chainDescriptorsConfig.get(
        toBigInt(holeskyChainId),
      );
      const holeskyDefault = DEFAULT_CHAIN_DESCRIPTORS.get(
        toBigInt(holeskyChainId),
      );
      assert.equal(holeskyConfig?.name, holeskyUserConfig.name);
      assert.equal(holeskyConfig?.chainType, holeskyUserConfig.chainType);
      assert.deepEqual(
        holeskyConfig?.hardforkHistory,
        holeskyDefault?.hardforkHistory,
      );
      assert.deepEqual(
        holeskyConfig?.blockExplorers,
        holeskyDefault?.blockExplorers,
      );

      const hoodiUserConfig = chainDescriptorsUserConfig[hoodiChainId];
      const hoodiConfig = chainDescriptorsConfig.get(toBigInt(hoodiChainId));
      const hoodiDefault = DEFAULT_CHAIN_DESCRIPTORS.get(
        toBigInt(hoodiChainId),
      );
      assert.equal(hoodiConfig?.name, hoodiUserConfig.name);
      assert.equal(hoodiConfig?.chainType, hoodiDefault?.chainType);
      assert.deepEqual(
        hoodiConfig?.hardforkHistory,
        hoodiDefault?.hardforkHistory,
      );
      assert.deepEqual(
        hoodiConfig?.blockExplorers,
        hoodiDefault?.blockExplorers,
      );
    });

    it("should return the default chain descriptors if no value is provided", async () => {
      const chainDescriptors = await resolveChainDescriptors(undefined);
      assert.deepEqual(chainDescriptors, DEFAULT_CHAIN_DESCRIPTORS);
    });

    it("should assign default values to the fields that are not provided", async () => {
      const chainDescriptorsUserConfig: ChainDescriptorsUserConfig = {
        31_337: {
          name: "My Network",
        },
      };
      const chainDescriptorsConfig = await resolveChainDescriptors(
        chainDescriptorsUserConfig,
      );

      const myNetworkConfig = chainDescriptorsConfig.get(31_337n);
      assert.equal(myNetworkConfig?.name, "My Network");
      assert.equal(myNetworkConfig?.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(myNetworkConfig?.hardforkHistory, undefined);
      assert.deepEqual(myNetworkConfig?.blockExplorers, {});
    });
  });

  describe("resolveHardfork", () => {
    it("should return the hardfork if it is provided", () => {
      let hardfork = resolveHardfork(L1HardforkName.LONDON, L1_CHAIN_TYPE);
      assert.equal(hardfork, L1HardforkName.LONDON);

      hardfork = resolveHardfork(L1HardforkName.LONDON, L1_CHAIN_TYPE);
      assert.equal(hardfork, L1HardforkName.LONDON);
    });

    it("should return the current hardfork if no hardfork is provided", () => {
      let hardfork = resolveHardfork(undefined, L1_CHAIN_TYPE);
      assert.equal(hardfork, getCurrentHardfork(L1_CHAIN_TYPE));

      hardfork = resolveHardfork(undefined, undefined);
      assert.equal(hardfork, getCurrentHardfork(L1_CHAIN_TYPE));

      hardfork = resolveHardfork(undefined, OPTIMISM_CHAIN_TYPE);
      assert.equal(hardfork, getCurrentHardfork(OPTIMISM_CHAIN_TYPE));
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
