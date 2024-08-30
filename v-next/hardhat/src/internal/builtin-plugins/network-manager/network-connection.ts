import type { NetworkConnection } from "./types.js";
import type {
  ChainType,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type { HookManager } from "@ignored/hardhat-vnext-core/types/hooks";

export class NetworkConnectionImplementation<
  ChainTypeT extends ChainType | string,
> implements NetworkConnection<ChainTypeT>
{
  static #currentId = 0;

  public readonly id: string;
  public readonly networkName: string;
  public readonly networkConfig: NetworkConfig;
  public readonly chainType: ChainTypeT;
  #provider!: EthereumProvider;
  readonly #hookManager: HookManager;

  public static async create<ChainTypeT extends ChainType | string>(
    networkName: string,
    chainType: ChainTypeT,
    networkConfig: NetworkConfig,
    hookManager: HookManager,
    createProvider: (
      networkConnection: NetworkConnectionImplementation<ChainTypeT>,
    ) => Promise<EthereumProvider>,
  ): Promise<NetworkConnectionImplementation<ChainTypeT>> {
    const networkConnection = new NetworkConnectionImplementation(
      networkName,
      chainType,
      networkConfig,
      hookManager,
    );

    const provider = await createProvider(networkConnection);
    networkConnection.#setProvider(provider);
    return networkConnection;
  }

  private static getNextId(): string {
    return `network-conn-${NetworkConnectionImplementation.#currentId++}`;
  }

  private constructor(
    networkName: string,
    chainType: ChainTypeT,
    networkConfig: NetworkConfig,
    hookManager: HookManager,
  ) {
    this.id = NetworkConnectionImplementation.getNextId();
    this.networkName = networkName;
    this.chainType = chainType;
    this.networkConfig = networkConfig;
    this.#hookManager = hookManager;

    this.close = this.close.bind(this);
  }

  public get provider(): EthereumProvider {
    return this.#provider;
  }

  #setProvider(provider: EthereumProvider) {
    this.#provider = provider;
  }

  public async close(): Promise<void> {
    await this.#hookManager.runHandlerChain(
      "network",
      "closeConnection",
      [this],
      async (_context, _connection) => {},
    );
  }
}
