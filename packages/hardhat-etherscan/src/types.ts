/* eslint-disable @typescript-eslint/naming-convention */

export enum Chains {
  mainnet = "mainnet",
  ropsten = "ropsten",
  rinkeby = "rinkeby",
  goerli = "goerli",
  kovan = "kovan",
  // binance smart chain
  bsc = "bsc",
  bscTestnet = "bscTestnet",
  // huobi eco chain
  heco = "heco",
  hecoTestnet = "hecoTestnet",
  // fantom mainnet
  opera = "opera",
  ftmTestnet = "ftmTestnet",
  // optimistim
  optimisticEthereum = "optimisticEthereum",
  optimisticKovan = "optimisticKovan",
  // polygon
  polygon = "polygon",
  polygonMumbai = "polygonMumbai",
  // arbitrum
  arbitrumOne = "arbitrumOne",
  arbitrumTestnet = "arbitrumTestnet",
  // avalanche
  avalanche = "avalanche",
  avalancheFujiTestnet = "avalancheFujiTestnet",
  // moonriver
  moonriver = "moonriver",
  moonbaseAlpha = "moonbaseAlpha",
}

export type ChainConfig = {
  [Network in Chains]: EtherscanChainConfig;
};

export type EtherscanApiKeys = {
  [Network in keyof ChainConfig]?: string;
};

export interface EtherscanConfig {
  apiKey?: string | EtherscanApiKeys;
}

export interface EtherscanURLs {
  apiURL: string;
  browserURL: string;
}

export interface EtherscanChainConfig {
  chainId: number;
  urls: EtherscanURLs;
}

export interface EtherscanNetworkEntry {
  network: Chains;
  urls: EtherscanURLs;
}
