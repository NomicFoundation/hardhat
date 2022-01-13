/// <reference types="mocha" />
import type { BN } from "ethereumjs-util";
export interface NetworksUserConfig {
    hardhat?: HardhatNetworkUserConfig;
    [networkName: string]: NetworkUserConfig | undefined;
}
export declare type NetworkUserConfig = HardhatNetworkUserConfig | HttpNetworkUserConfig;
export interface HardforkHistoryUserConfig {
    [hardforkName: string]: number;
}
export interface HardhatNetworkChainUserConfig {
    hardforkHistory?: HardforkHistoryUserConfig;
}
export interface HardhatNetworkChainsUserConfig {
    [chainId: number]: HardhatNetworkChainUserConfig;
}
export interface HardhatNetworkUserConfig {
    chainId?: number;
    from?: string;
    gas?: "auto" | number;
    gasPrice?: "auto" | number;
    gasMultiplier?: number;
    initialBaseFeePerGas?: number;
    hardfork?: string;
    mining?: HardhatNetworkMiningUserConfig;
    accounts?: HardhatNetworkAccountsUserConfig;
    blockGasLimit?: number;
    minGasPrice?: number | string;
    throwOnTransactionFailures?: boolean;
    throwOnCallFailures?: boolean;
    allowUnlimitedContractSize?: boolean;
    initialDate?: string;
    loggingEnabled?: boolean;
    forking?: HardhatNetworkForkingUserConfig;
    coinbase?: string;
    chains?: HardhatNetworkChainsUserConfig;
}
export declare type HardhatNetworkAccountsUserConfig = HardhatNetworkAccountUserConfig[] | HardhatNetworkHDAccountsUserConfig;
export interface HardhatNetworkAccountUserConfig {
    privateKey: string;
    balance: string;
}
export interface HardhatNetworkHDAccountsUserConfig {
    mnemonic?: string;
    initialIndex?: number;
    count?: number;
    path?: string;
    accountsBalance?: string;
}
export interface HDAccountsUserConfig {
    mnemonic: string;
    initialIndex?: number;
    count?: number;
    path?: string;
}
export interface HardhatNetworkForkingUserConfig {
    enabled?: boolean;
    url: string;
    blockNumber?: number;
}
export declare type HttpNetworkAccountsUserConfig = "remote" | string[] | HDAccountsUserConfig;
export interface HttpNetworkUserConfig {
    chainId?: number;
    from?: string;
    gas?: "auto" | number;
    gasPrice?: "auto" | number;
    gasMultiplier?: number;
    url?: string;
    timeout?: number;
    httpHeaders?: {
        [name: string]: string;
    };
    accounts?: HttpNetworkAccountsUserConfig;
}
export interface NetworksConfig {
    hardhat: HardhatNetworkConfig;
    localhost: HttpNetworkConfig;
    [networkName: string]: NetworkConfig;
}
export declare type NetworkConfig = HardhatNetworkConfig | HttpNetworkConfig;
export declare type HardforkHistoryConfig = Map<string, number>;
export interface HardhatNetworkChainConfig {
    hardforkHistory: HardforkHistoryConfig;
}
export declare type HardhatNetworkChainsConfig = Map<number, HardhatNetworkChainConfig>;
export interface HardhatNetworkConfig {
    chainId: number;
    from?: string;
    gas: "auto" | number;
    gasPrice: "auto" | number;
    gasMultiplier: number;
    initialBaseFeePerGas?: number;
    hardfork: string;
    mining: HardhatNetworkMiningConfig;
    accounts: HardhatNetworkAccountsConfig;
    blockGasLimit: number;
    minGasPrice: BN;
    throwOnTransactionFailures: boolean;
    throwOnCallFailures: boolean;
    allowUnlimitedContractSize: boolean;
    initialDate: string;
    loggingEnabled: boolean;
    forking?: HardhatNetworkForkingConfig;
    coinbase?: string;
    chains: HardhatNetworkChainsConfig;
}
export declare type HardhatNetworkAccountsConfig = HardhatNetworkHDAccountsConfig | HardhatNetworkAccountConfig[];
export interface HardhatNetworkAccountConfig {
    privateKey: string;
    balance: string;
}
export interface HardhatNetworkHDAccountsConfig {
    mnemonic: string;
    initialIndex: number;
    count: number;
    path: string;
    accountsBalance: string;
}
export interface HardhatNetworkForkingConfig {
    enabled: boolean;
    url: string;
    blockNumber?: number;
}
export interface HttpNetworkConfig {
    chainId?: number;
    from?: string;
    gas: "auto" | number;
    gasPrice: "auto" | number;
    gasMultiplier: number;
    url: string;
    timeout: number;
    httpHeaders: {
        [name: string]: string;
    };
    accounts: HttpNetworkAccountsConfig;
}
export declare type HttpNetworkAccountsConfig = "remote" | string[] | HttpNetworkHDAccountsConfig;
export interface HttpNetworkHDAccountsConfig {
    mnemonic: string;
    initialIndex: number;
    count: number;
    path: string;
}
export interface HardhatNetworkMiningConfig {
    auto: boolean;
    interval: number | [number, number];
    mempool: HardhatNetworkMempoolConfig;
}
export interface HardhatNetworkMiningUserConfig {
    auto?: boolean;
    interval?: number | [number, number];
    mempool?: HardhatNetworkMempoolUserConfig;
}
export interface HardhatNetworkMempoolConfig {
    order: string;
}
export interface HardhatNetworkMempoolUserConfig {
    order?: string;
}
export interface ProjectPathsUserConfig {
    root?: string;
    cache?: string;
    artifacts?: string;
    sources?: string;
    tests?: string;
}
export interface ProjectPathsConfig {
    root: string;
    configFile: string;
    cache: string;
    artifacts: string;
    sources: string;
    tests: string;
}
export declare type SolidityUserConfig = string | SolcUserConfig | MultiSolcUserConfig;
export interface SolcUserConfig {
    version: string;
    settings?: any;
}
export interface MultiSolcUserConfig {
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
}
export interface SolcConfig {
    version: string;
    settings: any;
}
export interface SolidityConfig {
    compilers: SolcConfig[];
    overrides: Record<string, SolcConfig>;
}
export interface HardhatUserConfig {
    defaultNetwork?: string;
    paths?: ProjectPathsUserConfig;
    networks?: NetworksUserConfig;
    solidity?: SolidityUserConfig;
    mocha?: Mocha.MochaOptions;
}
export interface HardhatConfig {
    defaultNetwork: string;
    paths: ProjectPathsConfig;
    networks: NetworksConfig;
    solidity: SolidityConfig;
    mocha: Mocha.MochaOptions;
}
export declare type ConfigExtender = (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => void;
//# sourceMappingURL=config.d.ts.map