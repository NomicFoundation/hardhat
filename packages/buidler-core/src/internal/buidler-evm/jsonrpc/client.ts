import { BN } from "ethereumjs-util";

import { HttpProvider } from "../../core/providers/http";
import { rpcQuantity } from "../provider/input";

export class JsonRpcClient {
  public static forUrl(url: string) {
    return new JsonRpcClient(new HttpProvider(url, "external network"));
  }

  constructor(private _httpProvider: HttpProvider) {}

  public async getLatestBlockNumber(): Promise<BN> {
    const result = await this._httpProvider.send("eth_blockNumber", []);
    return checkQuantity(result);
  }
}

function checkQuantity(value: unknown) {
  return rpcQuantity.decode(value).fold(
    () => doThrow("Invalid QUANTITY"),
    (x) => x
  );
}

function doThrow(message: string): never {
  // tslint:disable-next-line
  throw new Error(message); // TODO: What error to throw?
}
