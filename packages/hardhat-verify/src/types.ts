export interface ChainConfig {
  network: string;
  chainId: number;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

export interface EtherscanConfig {
  apiKey: ApiKey;
  customChains: ChainConfig[];
  enabled: boolean;
}

export interface SourcifyConfig {
  enabled: boolean;
}

export type ApiKey = string | Record<string, string>;
