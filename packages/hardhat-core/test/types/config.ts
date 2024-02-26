/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Config from "../../src/types/config";

// These are type-checking tests that pass if this file can be compiled.
// They are mainly here to fail if we add a new mandatory field in the config.

function hardhatConfig(): Config.HardhatConfig {
  return {
    defaultNetwork: "",
    paths: projectPathsConfig(),
    networks: networksConfig(),
    solidity: solidityConfig(),
    test: {},
  };
}

function projectPathsConfig(): Config.ProjectPathsConfig {
  return {
    root: "",
    configFile: "",
    cache: "",
    artifacts: "",
    sources: "",
    tests: "",
  };
}

function networksConfig(): Config.NetworksConfig {
  return {
    hardhat: hardhatNetworkConfig(),
    localhost: httpNetworkConfig(),

    customNetwork: networkConfig(),
  };
}

function solidityConfig(): Config.SolidityConfig {
  return {
    compilers: [solcConfig()],
    overrides: {
      "0.1.2": solcConfig(),
    },
  };
}

function solcConfig(): Config.SolcConfig {
  return {
    version: "1.2.3",
    settings: {},
  };
}

function networkConfig(): Config.NetworkConfig {
  return hardhatNetworkConfig();
  return httpNetworkConfig();
}

function hardhatNetworkConfig(): Config.HardhatNetworkConfig {
  const base = {
    chainId: 0,
    gasMultiplier: 0,
    hardfork: "",
    mining: hardhatNetworkMiningConfig(),
    accounts: hardhatNetworkAccountsConfig(),
    blockGasLimit: 0,
    minGasPrice: 0n,
    throwOnTransactionFailures: true,
    throwOnCallFailures: true,
    allowUnlimitedContractSize: true,
    initialDate: "",
    loggingEnabled: true,
    chains: hardhatNetworkChainsConfig(),
  };

  return {
    ...base,
    gas: "auto",
    gasPrice: "auto",
  };
  return {
    ...base,
    gas: 0,
    gasPrice: "auto",
  };
  return {
    ...base,
    gas: "auto",
    gasPrice: 0,
  };
  return {
    ...base,
    gas: 0,
    gasPrice: 0,
  };
}

function hardhatNetworkMiningConfig(): Config.HardhatNetworkMiningConfig {
  return {
    auto: true,
    interval: 0,
    mempool: hardhatNetworkMempoolConfig(),
  };
  return {
    auto: true,
    interval: [0, 1],
    mempool: hardhatNetworkMempoolConfig(),
  };
}

function hardhatNetworkMempoolConfig(): Config.HardhatNetworkMempoolConfig {
  return {
    order: "",
  };
}

function hardhatNetworkAccountsConfig(): Config.HardhatNetworkAccountsConfig {
  return hardhatNetworkHDAccountsConfig();

  return [hardhatNetworkAccountConfig()];
}

function hardhatNetworkHDAccountsConfig(): Config.HardhatNetworkHDAccountsConfig {
  return {
    mnemonic: "",
    initialIndex: 0,
    count: 0,
    path: "",
    accountsBalance: "",
    passphrase: "",
  };
}

function hardhatNetworkAccountConfig(): Config.HardhatNetworkAccountConfig {
  return {
    privateKey: "",
    balance: "",
  };
}

function hardhatNetworkChainsConfig(): Config.HardhatNetworkChainsConfig {
  const map = new Map();

  map.set(0, hardhatNetworkChainConfig());

  return map;
}

function hardhatNetworkChainConfig(): Config.HardhatNetworkChainConfig {
  return {
    hardforkHistory: hardforkHistoryConfig(),
  };
}

function hardforkHistoryConfig(): Config.HardforkHistoryConfig {
  const map = new Map();

  map.set("", 0);

  return map;
}

function httpNetworkConfig(): Config.HttpNetworkConfig {
  const base = {
    gasMultiplier: 0,
    url: "",
    timeout: 0,
    httpHeaders: {
      foo: "bar",
    },
    accounts: httpNetworkAccountsConfig(),
  };

  return {
    ...base,
    gas: "auto",
    gasPrice: "auto",
  };
  return {
    ...base,
    gas: 0,
    gasPrice: "auto",
  };
  return {
    ...base,
    gas: "auto",
    gasPrice: 0,
  };
  return {
    ...base,
    gas: 0,
    gasPrice: 0,
  };
}

function httpNetworkAccountsConfig(): Config.HttpNetworkAccountsConfig {
  return "remote";
  return ["", ""];
  return httpNetworkHDAccountsConfig();
}

function httpNetworkHDAccountsConfig(): Config.HttpNetworkHDAccountsConfig {
  return {
    mnemonic: "",
    initialIndex: 0,
    count: 0,
    path: "",
    passphrase: "",
  };
}

function hardhatNetworkForkingConfig(): Config.HardhatNetworkForkingConfig {
  return {
    enabled: true,
    url: "",
  };
}

function hardhatNetworkForkingUserConfig(): Config.HardhatNetworkForkingUserConfig {
  return {
    url: "",
  };
}

function hardhatUserConfig(): Config.HardhatUserConfig {
  return {};
}

function solidityUserConfig(): Config.SolidityUserConfig {
  return "1.2.3";

  return solcUserConfig();

  return multiSolcUserConfig();
}

function solcUserConfig(): Config.SolcUserConfig {
  return {
    version: "1.2.3",
  };
}

function multiSolcUserConfig(): Config.MultiSolcUserConfig {
  return {
    compilers: [solcUserConfig(), solcUserConfig()],
  };
}

function networksUserConfig(): Config.NetworksUserConfig {
  return {};
}

function networkUserConfig(): Config.NetworkUserConfig {
  return {};
}

function hardforkHistoryUserConfig(): Config.HardforkHistoryUserConfig {
  return {};
}

function hardhatNetworkChainUserConfig(): Config.HardhatNetworkChainUserConfig {
  return {};
}

function hardhatNetworkChainsUserConfig(): Config.HardhatNetworkChainsUserConfig {
  return {};
}

function hardhatNetworkUserConfig(): Config.HardhatNetworkUserConfig {
  return {};
}

function hardhatNetworkAccountsUserConfig(): Config.HardhatNetworkAccountsUserConfig {
  return {};
}

function hardhatNetworkAccountUserConfig(): Config.HardhatNetworkAccountUserConfig {
  return {
    privateKey: "",
    balance: "",
  };
}

function hardhatNetworkHDAccountsUserConfig(): Config.HardhatNetworkHDAccountsUserConfig {
  return {};
}

function hDAccountsUserConfig(): Config.HDAccountsUserConfig {
  return {
    mnemonic: "",
  };
}

function httpNetworkAccountsUserConfig(): Config.HttpNetworkAccountsUserConfig {
  return "remote";
  return ["", ""];
  return hDAccountsUserConfig();
}

function httpNetworkUserConfig(): Config.HttpNetworkUserConfig {
  return {};
}

function hardhatNetworkMiningUserConfig(): Config.HardhatNetworkMiningUserConfig {
  return {};
}

function hardhatNetworkMempoolUserConfig(): Config.HardhatNetworkMempoolUserConfig {
  return {};
}

function projectPathsUserConfig(): Config.ProjectPathsUserConfig {
  return {};
}

function configExtender(): Config.ConfigExtender {
  return (
    config: Config.HardhatConfig,
    userConfig: Readonly<Config.HardhatUserConfig>
  ) => {};
}
