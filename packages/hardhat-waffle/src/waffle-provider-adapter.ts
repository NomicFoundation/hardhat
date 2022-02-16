import { providers, Wallet } from "ethers";
import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";
import { HardhatNetworkConfig, Network } from "hardhat/types";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { pluginName } from "./constants";

// This class is an extension of hardhat-ethers' wrapper.
// TODO: Export hardhat-ether's wrapper so this can be implemented like a normal
//  subclass.
export class WaffleMockProviderAdapter extends providers.JsonRpcProvider {
  constructor(private _hardhatNetwork: Network) {
    super();
  }

  public getWallets() {
    if (this._hardhatNetwork.name !== "hardhat") {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `This method only works with Hardhat Network.
You can use \`await hre.ethers.getSigners()\` in other networks.`
      );
    }

    const networkConfig = this._hardhatNetwork.config as HardhatNetworkConfig;
    return normalizeHardhatNetworkAccountsConfig(networkConfig.accounts).map(
      (acc) => new Wallet(acc.privateKey, this)
    );
  }

  public createEmptyWallet() {
    return Wallet.createRandom().connect(this);
  }

  // Copied from hardhat-ethers
  public async send(method: string, params: any): Promise<any> {
    const result = await this._hardhatNetwork.provider.send(method, params);

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
