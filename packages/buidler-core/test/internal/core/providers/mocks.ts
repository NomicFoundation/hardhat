import { EventEmitter } from "events";

import { numberToRpcQuantity } from "../../../../src/internal/core/providers/provider-utils";
import { IEthereumProvider } from "../../../../src/types";

export class MethodReturningProvider extends EventEmitter
  implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    return method;
  }
}

export class ParamsReturningProvider extends EventEmitter
  implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    return params;
  }
}

/**
 * This mock is like the ParamsReturningProvider except it returns some hardcoded values
 */
export class BasicMockProvider extends EventEmitter
  implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getBlockByNumber") {
      return {
        gasLimit: numberToRpcQuantity(8000000)
      };
    }

    if (method === "eth_chainId") {
      return numberToRpcQuantity(123);
    }

    if (method === "web3_clientVersion") {
      return "Parity-Ethereum//v2.5.1-beta-e0141f8-20190510/x86_64-linux-gnu/rustc1.34.1";
    }

    return params;
  }
}

export class BasicGanacheMockProvider extends BasicMockProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "web3_clientVersion") {
      return "EthereumJS TestRPC/v2.5.5/ethereum-js";
    }

    return super.send(method, params);
  }
}

export class CountProvider extends EventEmitter implements IEthereumProvider {
  public transactionsCountParams: any[] | undefined = undefined;
  public numberOfCallsToNetVersion: number = 0;

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getTransactionCount") {
      this.transactionsCountParams = params;
      return numberToRpcQuantity(0x08);
    }

    if (method === "net_version") {
      this.numberOfCallsToNetVersion += 1;
      return numberToRpcQuantity(123);
    }

    if (method === "eth_accounts") {
      return [];
    }

    return params;
  }
}

export class ChainIdMockProvider extends EventEmitter
  implements IEthereumProvider {
  public numberOfCalls: number = 0;

  constructor(
    private readonly _chainId?: number,
    private readonly _netVersion?: number
  ) {
    super();
  }

  public async send(method: string, params?: any[]): Promise<any> {
    this.numberOfCalls += 1;

    if (method === "eth_chainId" && this._chainId !== undefined) {
      return numberToRpcQuantity(this._chainId);
    }

    if (method === "net_version" && this._netVersion !== undefined) {
      return numberToRpcQuantity(this._netVersion);
    }

    throw new Error(`Unsupported method ${method}`);
  }
}
