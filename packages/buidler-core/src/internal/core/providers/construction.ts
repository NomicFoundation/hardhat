import type {
  BoundExperimentalBuidlerEVMMessageTraceHook,
  BuidlerNetworkConfig,
  EIP1193Provider,
  HDAccountsConfig,
  HttpNetworkConfig,
  NetworkConfig,
  NetworkConfigAccounts,
  ProjectPaths,
} from "../../../types";
import { BUIDLEREVM_NETWORK_NAME } from "../../constants";
import { parseDateString } from "../../util/date";

export function isHDAccountsConfig(
  accounts?: NetworkConfigAccounts
): accounts is HDAccountsConfig {
  return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}

function importProvider<ModuleT, ProviderNameT extends keyof ModuleT>(
  filePath: string,
  name: ProviderNameT
): ModuleT[ProviderNameT] {
  const mod = require(filePath);
  return mod[name];
}

export function createProvider(
  networkName: string,
  networkConfig: NetworkConfig,
  solcVersion?: string,
  paths?: ProjectPaths,
  experimentalBuidlerEVMMessageTraceHooks: BoundExperimentalBuidlerEVMMessageTraceHook[] = []
): EIP1193Provider {
  let eip1193Provider: EIP1193Provider;

  if (networkName === BUIDLEREVM_NETWORK_NAME) {
    const buidlerNetConfig = networkConfig as BuidlerNetworkConfig;

    const BuidlerEVMProvider = importProvider<
      typeof import("../../buidler-evm/provider/provider"),
      "BuidlerEVMProvider"
    >("../../buidler-evm/provider/provider", "BuidlerEVMProvider");

    eip1193Provider = new BuidlerEVMProvider(
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
    const HttpProvider = importProvider<
      typeof import("./http"),
      "HttpProvider"
    >("./http", "HttpProvider");
    const httpNetConfig = networkConfig as HttpNetworkConfig;

    eip1193Provider = new HttpProvider(
      httpNetConfig.url!,
      networkName,
      httpNetConfig.httpHeaders,
      httpNetConfig.timeout
    );
  }

  const wrappedProvider = applyProviderWrappers(eip1193Provider, networkConfig);

  const BackwardsCompatibilityProviderAdapter = importProvider<
    typeof import("./backwards-compatibility"),
    "BackwardsCompatibilityProviderAdapter"
  >("./backwards-compatibility", "BackwardsCompatibilityProviderAdapter");

  return new BackwardsCompatibilityProviderAdapter(wrappedProvider);
}

export function applyProviderWrappers(
  provider: EIP1193Provider,
  netConfig: Partial<NetworkConfig>
): EIP1193Provider {
  // These dependencies are lazy-loaded because they are really big.
  const LocalAccountsProvider = importProvider<
    typeof import("./accounts"),
    "LocalAccountsProvider"
  >("./accounts", "LocalAccountsProvider");
  const HDWalletProvider = importProvider<
    typeof import("./accounts"),
    "HDWalletProvider"
  >("./accounts", "HDWalletProvider");
  const FixedSenderProvider = importProvider<
    typeof import("./accounts"),
    "FixedSenderProvider"
  >("./accounts", "FixedSenderProvider");
  const AutomaticSenderProvider = importProvider<
    typeof import("./accounts"),
    "AutomaticSenderProvider"
  >("./accounts", "AutomaticSenderProvider");

  const AutomaticGasProvider = importProvider<
    typeof import("./gas-providers"),
    "AutomaticGasProvider"
  >("./gas-providers", "AutomaticGasProvider");
  const FixedGasProvider = importProvider<
    typeof import("./gas-providers"),
    "FixedGasProvider"
  >("./gas-providers", "FixedGasProvider");
  const AutomaticGasPriceProvider = importProvider<
    typeof import("./gas-providers"),
    "AutomaticGasPriceProvider"
  >("./gas-providers", "AutomaticGasPriceProvider");
  const FixedGasPriceProvider = importProvider<
    typeof import("./gas-providers"),
    "FixedGasPriceProvider"
  >("./gas-providers", "FixedGasPriceProvider");
  const GanacheGasMultiplierProvider = importProvider<
    typeof import("./gas-providers"),
    "GanacheGasMultiplierProvider"
  >("./gas-providers", "GanacheGasMultiplierProvider");

  const ChainIdValidatorProvider = importProvider<
    typeof import("./chainId"),
    "ChainIdValidatorProvider"
  >("./chainId", "ChainIdValidatorProvider");

  const isHttpNetworkConfig = "url" in netConfig;

  if (isHttpNetworkConfig) {
    const httpNetConfig = netConfig as Partial<HttpNetworkConfig>;
    const accounts = httpNetConfig.accounts;

    if (Array.isArray(accounts)) {
      provider = new LocalAccountsProvider(provider, accounts);
    } else if (isHDAccountsConfig(accounts)) {
      provider = new HDWalletProvider(
        provider,
        accounts.mnemonic,
        accounts.path,
        accounts.initialIndex,
        accounts.count
      );
    }

    // TODO: Add some extension mechanism for account plugins here

    if (typeof httpNetConfig.gas !== "number") {
      provider = new GanacheGasMultiplierProvider(provider);
    }
  }

  if (netConfig.from !== undefined) {
    provider = new FixedSenderProvider(provider, netConfig.from);
  } else {
    provider = new AutomaticSenderProvider(provider);
  }

  if (netConfig.gas === undefined || netConfig.gas === "auto") {
    provider = new AutomaticGasProvider(provider, netConfig.gasMultiplier);
  } else {
    provider = new FixedGasProvider(provider, netConfig.gas);
  }

  if (netConfig.gasPrice === undefined || netConfig.gasPrice === "auto") {
    provider = new AutomaticGasPriceProvider(provider);
  } else {
    provider = new FixedGasPriceProvider(provider, netConfig.gasPrice);
  }

  if (isHttpNetworkConfig && netConfig.chainId !== undefined) {
    provider = new ChainIdValidatorProvider(provider, netConfig.chainId);
  }

  return provider;
}
