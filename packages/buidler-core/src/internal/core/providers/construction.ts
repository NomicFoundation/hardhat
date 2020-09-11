import {
  BoundExperimentalBuidlerEVMMessageTraceHook,
  BuidlerNetworkConfig,
  EthereumProvider,
  HDAccountsConfig,
  HttpNetworkConfig,
  IEthereumProvider,
  NetworkConfig,
  NetworkConfigAccounts,
  ProjectPaths,
} from "../../../types";
import { BUIDLEREVM_NETWORK_NAME } from "../../constants";
import { parseDateString } from "../../util/date";

import { HttpProvider } from "./http";

export function isHDAccountsConfig(
  accounts?: NetworkConfigAccounts
): accounts is HDAccountsConfig {
  return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}

export function createProvider(
  networkName: string,
  networkConfig: NetworkConfig,
  solcVersion?: string,
  paths?: ProjectPaths,
  experimentalBuidlerEVMMessageTraceHooks: BoundExperimentalBuidlerEVMMessageTraceHook[] = []
): IEthereumProvider {
  let provider: EthereumProvider;

  if (networkName === BUIDLEREVM_NETWORK_NAME) {
    const buidlerNetConfig = networkConfig as BuidlerNetworkConfig;

    const {
      BuidlerEVMProvider,
    } = require("../../buidler-evm/provider/provider");

    provider = new BuidlerEVMProvider(
      buidlerNetConfig.hardfork!,
      BUIDLEREVM_NETWORK_NAME,
      buidlerNetConfig.chainId!,
      buidlerNetConfig.chainId!,
      buidlerNetConfig.blockGasLimit!,
      buidlerNetConfig.throwOnTransactionFailures!,
      buidlerNetConfig.throwOnCallFailures!,
      buidlerNetConfig.accounts,
      solcVersion,
      paths,
      buidlerNetConfig.loggingEnabled,
      buidlerNetConfig.allowUnlimitedContractSize,
      buidlerNetConfig.initialDate !== undefined
        ? parseDateString(buidlerNetConfig.initialDate)
        : undefined,
      experimentalBuidlerEVMMessageTraceHooks
    );
  } else {
    const httpNetConfig = networkConfig as HttpNetworkConfig;

    provider = new HttpProvider(
      httpNetConfig.url!,
      networkName,
      httpNetConfig.httpHeaders,
      httpNetConfig.timeout
    );
  }

  return wrapEthereumProvider(provider, networkConfig);
}

export function wrapEthereumProvider(
  provider: IEthereumProvider,
  netConfig: Partial<NetworkConfig>
): IEthereumProvider {
  // These dependencies are lazy-loaded because they are really big.
  // We use require() instead of import() here, because we need it to be sync.

  const {
    createHDWalletProvider,
    createLocalAccountsProvider,
    createSenderProvider,
  } = require("./accounts");

  const {
    createAutomaticGasPriceProvider,
    createAutomaticGasProvider,
    createFixedGasPriceProvider,
    createFixedGasProvider,
  } = require("./gas-providers");

  const { createChainIdValidationProvider } = require("./chainId");

  const isHttpNetworkConfig = "url" in netConfig;

  if (isHttpNetworkConfig) {
    const httpNetConfig = netConfig as Partial<HttpNetworkConfig>;

    const accounts = httpNetConfig.accounts;
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

    const { createGanacheGasMultiplierProvider } = require("./gas-providers");

    if (typeof httpNetConfig.gas !== "number") {
      provider = createGanacheGasMultiplierProvider(provider);
    }
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

  if (isHttpNetworkConfig) {
    if (netConfig.chainId !== undefined) {
      return createChainIdValidationProvider(provider, netConfig.chainId);
    }
  }

  return provider;
}
