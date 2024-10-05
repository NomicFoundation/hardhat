export type HardforkHistoryConfig = Map<
  /* hardforkName */ string,
  /* blockNumber */ number
>;

export interface HardhatNetworkChainConfig {
  hardforkHistory: HardforkHistoryConfig;
}

export type HardhatNetworkChainsConfig = Map<
  /* chainId */ number,
  HardhatNetworkChainConfig
>;
