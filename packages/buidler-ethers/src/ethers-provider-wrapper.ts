import { IEthereumProvider } from "@nomiclabs/buidler/types";
import { ethers } from "ethers";

export class EthersProviderWrapper extends ethers.providers.JsonRpcProvider {
  private readonly _hardhatProvider: IEthereumProvider;

  constructor(hardhatProvider: IEthereumProvider) {
    super();
    this._hardhatProvider = hardhatProvider;
  }

  public async send(method: string, params: any): Promise<any> {
    const result = await this._hardhatProvider.send(method, params);

    // We replicate ethers' behavior.
    this.emit("debug", {
      action: "send",
      request: {
        id: 42,
        jsonrpc: "2.0",
        method,
        params,
      },
      response: result,
      provider: this,
    });

    return result;
  }
}
