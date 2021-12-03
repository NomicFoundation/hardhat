/* eslint-disable @typescript-eslint/naming-convention */

export enum Chains {
  mainnet = "mainnet",
  ropsten = "ropsten",
  rinkeby = "rinkeby",
  goerli = "goerli",
  kovan = "kovan",
  // binance smart chain
  bsc = "bsc",
  bsc_testnet = "bsc_testnet",
  // huobi eco chain
  heco = "heco",
  heco_testnet = "heco_testnet",
  // fantom mainnet
  opera = "opera",
  ftm_testnet = "ftm_testnet",
  // optimistim
  optimistic_ethereum = "optimistic_ethereum",
  optimistic_kovan = "optimistic_kovan",
  // polygon
  polygon = "polygon",
  polygon_mumbai = "polygon_mumbai",
  // arbitrum
  arbitrum_one = "arbitrum_one",
  arbitrum_testnet = "arbitrum_testnet",
  // avalanche
  avalanche = "avalanche",
  avalanche_fuji_testnet = "avalanche_fuji_testnet",
  // moonriver
  moonriver = "moonriver",
  moonbase_alpha = "moonbase_alpha",
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
