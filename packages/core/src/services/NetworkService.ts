import { Providers } from "../types/providers";

export interface INetworkService {
  getChainId(): Promise<number>;
}

export class NetworkService implements INetworkService {
  constructor(private readonly _providers: Providers) {}

  public async getChainId(): Promise<number> {
    const result = await this._providers.ethereumProvider.request({
      method: "eth_chainId",
    });

    return Number(result);
  }
}
