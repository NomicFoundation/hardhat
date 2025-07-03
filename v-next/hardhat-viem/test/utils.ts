import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import EventEmitter from "node:events";

export class MockEthereumProvider
  extends EventEmitter
  implements EthereumProvider
{
  public callCount = 0;

  constructor(public returnValues: Record<string, any> = {}) {
    super();
  }

  public async request(args: RequestArguments): Promise<any> {
    if (this.returnValues[args.method] !== undefined) {
      this.callCount++;
      return this.returnValues[args.method];
    }

    throw new Error("Method not supported");
  }

  public close(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public send(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  public sendAsync(): void {
    throw new Error("Method not implemented.");
  }
}
