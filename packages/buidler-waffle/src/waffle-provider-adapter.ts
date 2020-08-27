import { BuidlerNetworkConfig, Network } from "@nomiclabs/buidler/types";
import { providers, Wallet } from "ethers";

// This class is an extension of buidler-ethers' wrapper.
// TODO: Export buidler-ether's wrapper so this can be implemented like a normal
//  subclass.
export class WaffleMockProviderAdapter extends providers.JsonRpcProvider {
  constructor(private _buidlerNetwork: Network) {
    super();
  }

  public getWallets() {
    if (this._buidlerNetwork.name !== "buidlerevm") {
      throw new Error(`This method only works with Buidler EVM.
You can use \`await bre.ethers.signers()\` in other networks.`);
    }

    return (this._buidlerNetwork.config as BuidlerNetworkConfig).accounts!.map(
      (acc) => new Wallet(acc.privateKey, this)
    );
  }

  public createEmptyWallet() {
    return Wallet.createRandom().connect(this);
  }

  // Copied from buidler-ethers
  public async send(method: string, params: any): Promise<any> {
    const result = await this._buidlerNetwork.provider.send(method, params);

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
