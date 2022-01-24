declare type Chain = "mainnet" | "ropsten" | "rinkeby" | "goerli" | "kovan" | "bsc" | "bscTestnet" | "heco" | "hecoTestnet" | "opera" | "ftmTestnet" | "optimisticEthereum" | "optimisticKovan" | "polygon" | "polygonMumbai" | "arbitrumOne" | "arbitrumTestnet" | "avalanche" | "avalancheFujiTestnet" | "moonbeam" | "moonriver" | "moonbaseAlpha" | "xdai" | "sokol";
export declare type ChainConfig = {
    [Network in Chain]: EtherscanChainConfig;
};
declare type EtherscanApiKeys = {
    [Network in Chain]?: string;
};
export interface EtherscanConfig {
    apiKey?: string | EtherscanApiKeys;
}
export interface EtherscanURLs {
    apiURL: string;
    browserURL: string;
}
interface EtherscanChainConfig {
    chainId: number;
    urls: EtherscanURLs;
}
export interface EtherscanNetworkEntry {
    network: Chain;
    urls: EtherscanURLs;
}
export {};
//# sourceMappingURL=types.d.ts.map