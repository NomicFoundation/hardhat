import type { NetworkConfig } from "../../../types/config.js";
import type { ChainType, NetworkConnection } from "../../../types/network.js";
import type { EthereumProvider } from "../../../types/providers.js";

export type CloseConnectionFunction<ChainTypeT extends ChainType | string> = (
  networkConnection: NetworkConnectionImplementation<ChainTypeT>,
) => Promise<void>;

export class NetworkConnectionImplementation<
  ChainTypeT extends ChainType | string,
> implements NetworkConnection<ChainTypeT>
{
  public readonly id: number;
  public readonly networkName: string;
  public readonly networkConfig: Readonly<NetworkConfig>;
  public readonly chainType: ChainTypeT;

  #provider!: EthereumProvider;

  readonly #closeConnection: CloseConnectionFunction<ChainTypeT>;

  public static async create<ChainTypeT extends ChainType | string>(
    id: number,
    networkName: string,
    chainType: ChainTypeT,
    networkConfig: NetworkConfig,
    closeConnection: CloseConnectionFunction<ChainTypeT>,
    createProvider: (
      networkConnection: NetworkConnectionImplementation<ChainTypeT>,
    ) => Promise<EthereumProvider>,
  ): Promise<NetworkConnectionImplementation<ChainTypeT>> {
    const networkConnection = new NetworkConnectionImplementation(
      id,
      networkName,
      chainType,
      networkConfig,
      closeConnection,
    );

    const provider = await createProvider(networkConnection);
    networkConnection.#setProvider(provider);
    return networkConnection;
  }

  private constructor(
    id: number,
    networkName: string,
    chainType: ChainTypeT,
    networkConfig: NetworkConfig,
    closeConnection: CloseConnectionFunction<ChainTypeT>,
  ) {
    this.id = id;
    this.networkName = networkName;
    this.chainType = chainType;
    this.networkConfig = networkConfig;
    this.#closeConnection = closeConnection;

    this.close = this.close.bind(this);
  }

  public get provider(): EthereumProvider {
    return this.#provider;
  }

  #setProvider(provider: EthereumProvider) {
    this.#provider = provider;
  }

  public async close(): Promise<void> {
    await this.#closeConnection(this);
  }
}
