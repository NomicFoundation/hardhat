export type ChainConfig = Record<string, EtherscanChainConfig>;

export interface CustomChain {
  network: string;
  chainId: number;
  urls: EtherscanURLs;
}

export interface EtherscanUserConfig {
  apiKey?: string | Record<string, string>;
  customChains?: CustomChain[];
}

export interface EtherscanConfig {
  apiKey?: string | Record<string, string>;
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
