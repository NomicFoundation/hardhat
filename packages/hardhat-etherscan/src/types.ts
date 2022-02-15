export type ChainConfig = {
  [chain : string]: EtherscanChainConfig;
};

type EtherscanApiKeys = {
  [chain : string]: string;
};

export interface EtherscanConfig {
  apiKey?: string | EtherscanApiKeys;
  extendChainConfig? : { [chain: string] : EtherscanChainConfig }
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
  network: string;
  urls: EtherscanURLs;
}
