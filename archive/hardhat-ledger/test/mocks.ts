import EventEmitter from "events";

import { EIP1193Provider, RequestArguments } from "hardhat/types";

export class EthereumMockedProvider
  extends EventEmitter
  implements EIP1193Provider
{
  public async request(_args: RequestArguments): Promise<any> {}
}
