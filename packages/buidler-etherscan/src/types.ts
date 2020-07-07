export interface EtherscanConfig {
  url: string;
  apiKey: string;
}

export interface ContractDeploymentManifest {
  address: string;
  args: string[];
}