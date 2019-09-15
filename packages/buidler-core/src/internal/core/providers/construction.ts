import {
  HDAccountsConfig,
  HttpNetworkConfig,
  IEthereumProvider,
  NetworkConfig,
  NetworkConfigAccounts
} from "../../../types";

import { HttpProvider } from "./http";

export function isHDAccountsConfig(
  accounts?: NetworkConfigAccounts
): accounts is HDAccountsConfig {
  return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}

export function createProvider(
  networkName: string,
  networkConfig: NetworkConfig
): IEthereumProvider {
  const netConfig = networkConfig as HttpNetworkConfig;

  const provider: IEthereumProvider = new HttpProvider(
    netConfig.url!,
    networkName,
    undefined,
    netConfig.timeout
  );

  return wrapEthereumProvider(provider, netConfig);
}

export function wrapEthereumProvider(
  provider: IEthereumProvider,
  netConfig: Partial<HttpNetworkConfig>
): IEthereumProvider {
  // These dependencies are lazy-loaded because they are really big.
  // We use require() instead of import() here, because we need it to be sync.

  const {
    createHDWalletProvider,
    createLocalAccountsProvider,
    createSenderProvider
  } = require("./accounts");

  const {
    createGanacheGasMultiplierProvider,
    createAutomaticGasPriceProvider,
    createAutomaticGasProvider,
    createFixedGasPriceProvider,
    createFixedGasProvider
  } = require("./gas-providers");

  const { createChainIdValidationProvider } = require("./chainId");

  const accounts = netConfig.accounts;
  if (Array.isArray(accounts)) {
    provider = createLocalAccountsProvider(provider, accounts);
  } else if (isHDAccountsConfig(accounts)) {
    provider = createHDWalletProvider(
      provider,
      accounts.mnemonic,
      accounts.path,
      accounts.initialIndex,
      accounts.count
    );
  }

  // TODO: Add some extension mechanism for account plugins here

  if (typeof netConfig.gas !== "number") {
    provider = createGanacheGasMultiplierProvider(provider);
  }

  provider = createSenderProvider(provider, netConfig.from);

  if (netConfig.gas === undefined || netConfig.gas === "auto") {
    provider = createAutomaticGasProvider(provider, netConfig.gasMultiplier);
  } else {
    provider = createFixedGasProvider(provider, netConfig.gas);
  }

  if (netConfig.gasPrice === undefined || netConfig.gasPrice === "auto") {
    provider = createAutomaticGasPriceProvider(provider);
  } else {
    provider = createFixedGasPriceProvider(provider, netConfig.gasPrice);
  }

  if (netConfig.chainId !== undefined) {
    return createChainIdValidationProvider(provider, netConfig.chainId);
  }

  return provider;
}
