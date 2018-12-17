import Transaction from "ethereumjs-tx";
import { EventEmitter } from "events";
import { EthereumProvider } from "web3x/providers";

export class EthereumLocalAccountsProvider extends EventEmitter
  implements EthereumProvider {
  constructor(
    private provider: EthereumProvider,
    private accounts: string[] = [],
    private chainId: number
  ) {
    super();
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_accounts") {
      return this.accounts;
    } else if (method === "eth_requestAccounts") {
      return this.accounts;
    } else if (method === "eth_sign") {
      throw new Error("eth_sign is not supported yet");
    } else if (method === "eth_sendTransaction") {
      if (params === undefined || params.length < 1) {
        throw Error("Missing required parameters");
      }

      const from = params[0];
      const to = params[1];
      const gasLimit = params[2];
      const gasPrice = params[3];
      const value = params[4];
      const data = params[5];
      let nonce = params[6];

      if (gasLimit === undefined || gasPrice === undefined) {
        throw Error("Missing gas");
      }

      if (nonce === undefined) {
        nonce = await this.send("eth_getTransactionCount", [from, "pending"]);
      }

      const chainId = this.chainId;
      const transaction = new Transaction({
        to,
        gasPrice,
        gasLimit,
        value,
        data,
        nonce,
        chainId
      });

      transaction.sign(Buffer.from(this.accounts[0], "hex"));
      const signedTx = transaction.serialize().toString("hex");
      return this.send("eth_sendRawTransaction", [signedTx]);
    } else {
      return this.provider.send(method, params);
    }
  }
}
