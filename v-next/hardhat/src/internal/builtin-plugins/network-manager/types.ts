import type {
  ChainType,
  DefaultChainType,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

export interface NetworkManager {
  connect<ChainTypeT extends ChainType | string = DefaultChainType>(
    networkName?: string,
    chainType?: ChainTypeT,
    networkConfigOverride?: Partial<NetworkConfig>,
  ): Promise<NetworkConnection<ChainTypeT>>;
}

export interface NetworkConnection<ChainTypeT extends ChainType | string> {
  readonly id: string;
  readonly networkName: string;
  readonly networkConfig: NetworkConfig;
  readonly chainType: ChainTypeT;
  readonly provider: EthereumProvider;

  close(): Promise<void>;
}
