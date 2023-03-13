interface CustomChain {
  network: string;
  chainId: number;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

export interface EtherscanConfig {
  apiKey: string | Record<string, string>;
  customChains: CustomChain[];
}
