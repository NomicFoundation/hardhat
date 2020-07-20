import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import { HttpProvider } from "../../core/providers/http";
import { rpcQuantity } from "../provider/input";

export class JsonRpcClient {
  public static forUrl(url: string) {
    return new JsonRpcClient(new HttpProvider(url, "external network"));
  }

  constructor(private _httpProvider: HttpProvider) {}

  public async getLatestBlockNumber(): Promise<BN> {
    const result = await this._httpProvider.send("eth_blockNumber", []);
    return decode(result, rpcQuantity);
  }
}

function decode<T>(value: unknown, codec: t.Type<T>) {
  return codec.decode(value).fold(() => {
    // TODO: What error to throw?
    // tslint:disable-next-line
    throw new Error(`Invalid ${codec.name}`);
  }, t.identity);
}
