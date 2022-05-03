type Chain =
  | "mainnet"
  | "ropsten"
  | "rinkeby"
  | "goerli"
  | "kovan"
  // binance smart chain
  | "bsc"
  | "bscTestnet"
  // huobi eco chain
  | "heco"
  | "hecoTestnet"
  // fantom mainnet
  | "opera"
  | "ftmTestnet"
  // optimistim
  | "optimisticEthereum"
  | "optimisticKovan"
  // polygon
  | "polygon"
  | "polygonMumbai"
  // arbitrum
  | "arbitrumOne"
  | "arbitrumTestnet"
  // avalanche
  | "avalanche"
  | "avalancheFujiTestnet"
  // moonbeam
  | "moonbeam"
  | "moonriver"
  | "moonbaseAlpha"
  | "harmony"
  | "harmonyTest"
  // xdai
  | "xdai"
  | "sokol"
  // aurora
  | "aurora"
  | "auroraTestnet";

export type ChainConfig = {
  [Network in Chain]: EtherscanChainConfig;
};

type EtherscanApiKeys = {
  [Network in Chain]?: string;
};

export interface CustomChain {
  network: string;
  chainId: number;
  urls: EtherscanURLs;
}

export interface EtherscanUserConfig {
  apiKey?: string | EtherscanApiKeys;
  customChains?: CustomChain[];
}

export interface EtherscanConfig {
  apiKey?: string | EtherscanApiKeys;
  customChains: CustomChain[];
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
  network: string;
  urls: EtherscanURLs;
}
