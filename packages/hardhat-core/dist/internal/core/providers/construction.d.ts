import type { Artifacts, BoundExperimentalHardhatNetworkMessageTraceHook, EIP1193Provider, EthereumProvider, HDAccountsUserConfig, HttpNetworkAccountsUserConfig, NetworkConfig, ProjectPathsConfig } from "../../../types";
export declare function isHDAccountsConfig(accounts?: HttpNetworkAccountsUserConfig): accounts is HDAccountsUserConfig;
export declare function createProvider(networkName: string, networkConfig: NetworkConfig, paths?: ProjectPathsConfig, artifacts?: Artifacts, experimentalHardhatNetworkMessageTraceHooks?: BoundExperimentalHardhatNetworkMessageTraceHook[]): EthereumProvider;
export declare function applyProviderWrappers(provider: EIP1193Provider, netConfig: Partial<NetworkConfig>): EIP1193Provider;
//# sourceMappingURL=construction.d.ts.map