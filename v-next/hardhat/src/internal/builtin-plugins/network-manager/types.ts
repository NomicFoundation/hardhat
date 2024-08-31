import type {
  ChainType,
  DefaultChainType,
  NetworkConfig,
} from "../../../types/config.js";
import type { EthereumProvider } from "../../../types/providers.js";

export interface NetworkManager {
  connect<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkName?: string,
    chainType?: ChainTypeT,
    networkConfigOverride?: Partial<NetworkConfig>,
  ): Promise<NetworkConnection<ChainTypeT>>;
}

export interface NetworkConnection<ChainTypeT extends ChainType | string> {
  readonly id: number;
  readonly networkName: string;
  readonly networkConfig: NetworkConfig;
  readonly chainType: ChainTypeT;
  readonly provider: EthereumProvider;

  close(): Promise<void>;
}
