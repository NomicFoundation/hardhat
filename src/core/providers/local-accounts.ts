import Transaction from "ethereumjs-tx";
import { promisify } from "util";
import {
  createJsonRpcPayload,
  JsonRpcRequest,
  JsonRpcResponse
} from "web3x/providers/jsonrpc";
import { LegacyProvider } from "web3x/providers/legacy-provider";

import { EthereumProvider } from "./ethereum";

export class EthereumProviderLocalAccounts extends EthereumProvider
  implements IEthereumProvider {
  constructor(
    provider: LegacyProvider,
    private accounts: string[] = [],
    private chainId: number
  ) {
    super(provider);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_accounts") {
      return this.accounts;
    } else if (method === "eth_requestAccounts") {
      return this.accounts;
    } else if (method === "eth_sendTransaction") {
      if (params === undefined || params.length < 1) {
        throw Error("missing required parameters");
      }

      const from = params[0];
      const to = params[1];
      const gasLimit = params[2];
      const gasPrice = params[3];
      const value = params[4];
      const data = params[5];
      let nonce = params[6];

      if (gasLimit === undefined || gasPrice === undefined) {
        throw Error("missing gas");
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
      const payload = createJsonRpcPayload(method, params);

      // console.log("payload: ", payload);
      const promisifiedSend: (
        payload: JsonRpcRequest
      ) => Promise<any> = promisify(this.provider.send.bind(this.provider));

      const response: JsonRpcResponse = await promisifiedSend(payload);
      if (response.error === undefined) {
        return response.result;
      } else {
        throw Error(response.error.message);
      }
    }
  }
}

export interface IEthereumProvider {
  send(method: string, params?: any[]): Promise<any>;
  on(type: string, listener: (result: any) => void): this;
}
