import type {
  Artifacts,
  BoundExperimentalHardhatNetworkMessageTraceHook,
  EIP1193Provider,
  EthereumProvider,
  HardhatNetworkConfig,
  HDAccountsUserConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  ProjectPathsConfig,
} from "../../../types";
import { HARDHAT_NETWORK_NAME } from "../../constants";
import { ModulesLogger } from "../../hardhat-network/provider/modules/logger";
import { ForkConfig } from "../../hardhat-network/provider/node-types";
import { getForkCacheDirPath } from "../../hardhat-network/provider/utils/disk-cache";
import { parseDateString } from "../../util/date";

import { normalizeHardhatNetworkAccountsConfig } from "./util";

export function isHDAccountsConfig(
  accounts?: HttpNetworkAccountsUserConfig
): accounts is HDAccountsUserConfig {
  return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}

function isResolvedHttpNetworkConfig(
  netConfig: Partial<NetworkConfig>
): netConfig is HttpNetworkConfig {
  return "url" in netConfig;
}

// This function is let's you import a provider dynamically in a pretty
// type-safe way.
// `ProviderNameT` and `name` must be the same literal string. TS enforces it.
// `ModuleT` and `filePath` must also be the same, but this is not enforced.
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
  paths?: ProjectPathsConfig,
  artifacts?: Artifacts,
  experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = []
): EthereumProvider {
  let eip1193Provider: EIP1193Provider;

  if (networkName === HARDHAT_NETWORK_NAME) {
    const hardhatNetConfig = networkConfig as HardhatNetworkConfig;

    const HardhatNetworkProvider = importProvider<
      typeof import("../../hardhat-network/provider/provider"),
      "HardhatNetworkProvider"
    >("../../hardhat-network/provider/provider", "HardhatNetworkProvider");

    let forkConfig: ForkConfig | undefined;

    if (
      hardhatNetConfig.forking?.enabled === true &&
      hardhatNetConfig.forking?.url !== undefined
    ) {
      forkConfig = {
        jsonRpcUrl: hardhatNetConfig.forking?.url,
        blockNumber: hardhatNetConfig.forking?.blockNumber,
      };
    }

    const accounts = normalizeHardhatNetworkAccountsConfig(
      hardhatNetConfig.accounts
    );

    eip1193Provider = new HardhatNetworkProvider(
      hardhatNetConfig.hardfork!,
      HARDHAT_NETWORK_NAME,
      hardhatNetConfig.chainId!,
      hardhatNetConfig.chainId!,
      hardhatNetConfig.blockGasLimit!,
      hardhatNetConfig.throwOnTransactionFailures!,
      hardhatNetConfig.throwOnCallFailures!,
      hardhatNetConfig.mining.auto,
      hardhatNetConfig.mining.interval,
      new ModulesLogger(hardhatNetConfig.loggingEnabled),
      accounts,
      artifacts,
      hardhatNetConfig.allowUnlimitedContractSize,
      hardhatNetConfig.initialDate !== undefined
        ? parseDateString(hardhatNetConfig.initialDate)
        : undefined,
      experimentalHardhatNetworkMessageTraceHooks,
      forkConfig,
      paths !== undefined ? getForkCacheDirPath(paths) : undefined
    );
  } else {
    const HttpProvider = importProvider<
      typeof import("./http"),
      "HttpProvider"
    >("./http", "HttpProvider");
    const httpNetConfig = networkConfig as HttpNetworkUserConfig;

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

  if (isResolvedHttpNetworkConfig(netConfig)) {
    const accounts = netConfig.accounts;

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

    if (typeof netConfig.gas !== "number") {
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

  if (
    isResolvedHttpNetworkConfig(netConfig) &&
    netConfig.chainId !== undefined
  ) {
    provider = new ChainIdValidatorProvider(provider, netConfig.chainId);
  }

  return provider;
}
