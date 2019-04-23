import {
  HDAccountsConfig,
  HttpNetworkConfig,
  IEthereumProvider,
  NetworkConfigAccounts,
  Networks
} from "../../../types";
import { BuidlerError, ERRORS } from "../errors";

export function isHDAccountsConfig(
  accounts?: NetworkConfigAccounts
): accounts is HDAccountsConfig {
  return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}

export function createProvider(
  selectedNetwork: string,
  networksConfig?: Networks
): IEthereumProvider {
  if (
    networksConfig === undefined ||
    networksConfig[selectedNetwork] === undefined
  ) {
    throw new BuidlerError(ERRORS.NETWORK.CONFIG_NOT_FOUND, selectedNetwork);
  }

  if (selectedNetwork === "auto") {
    throw new BuidlerError(
      ERRORS.GENERAL.UNSUPPORTED_OPERATION,
      "auto network"
    );
  }

  const netConfig = networksConfig[selectedNetwork] as Partial<
    HttpNetworkConfig
  >;

  // These dependencies are lazy-loaded because they are really big.
  // We use require() instead of import() here, because we need it to be sync.

  const { HttpProvider } = require("web3x/providers");

  const url =
    netConfig.url !== undefined ? netConfig.url : "http://localhost:8545";

  const provider: IEthereumProvider = new HttpProvider(url);

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
    createAutomaticGasPriceProvider,
    createAutomaticGasProvider,
    createFixedGasPriceProvider,
    createFixedGasProvider
  } = require("./gas-providers");

  const { createNetworkProvider } = require("./network");

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

  return createNetworkProvider(provider, netConfig.chainId);
}
