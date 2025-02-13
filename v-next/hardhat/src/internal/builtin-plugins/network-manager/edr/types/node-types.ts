export interface Hardhat2BuildInfo {
  _format: "hh-sol-build-info-1";
  id: string;
  solcVersion: string;
  solcLongVersion: string;
  input: any;
  output: any;
}

export interface TracingConfig {
  buildInfos?: Hardhat2BuildInfo[];
  ignoreContracts?: boolean;
}
