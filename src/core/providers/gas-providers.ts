import { Tx } from "web3x/eth";

import { IEthereumProvider } from "./ethereum";

import { WrappedProvider } from "./wrapper";

export class FixedGasProvider extends WrappedProvider {
  constructor(
    provider: IEthereumProvider,
    private readonly gasLimit?: number,
    private readonly gasPrice?: number
  ) {
    super(provider);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_estimateGas" && this.gasLimit !== undefined) {
      return this.gasLimit;
    }

    if (method === "eth_gasPrice" && this.gasPrice !== undefined) {
      return this.gasPrice;
    }

    if (
      method === "eth_sendTransaction" &&
      params !== undefined &&
      params.length > 0
    ) {
      const originalTxObject = params[0] as Partial<Tx>;
      const txObject = { ...originalTxObject };

      if (txObject.gas === undefined && this.gasLimit !== undefined) {
        txObject.gas = this.gasLimit;
      }

      if (txObject.gasPrice === undefined && this.gasPrice !== undefined) {
        txObject.gasPrice = this.gasPrice;
      }

      params = [...params];
      params[0] = txObject;
    }

    return super.send(method, params);
  }
}

export class AutomaticGasProvider extends WrappedProvider {
  constructor(
    provider: IEthereumProvider,
    private readonly automaticGasLimit: boolean,
    private readonly automaticGasPrice: boolean
  ) {
    super(provider);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (
      method === "eth_sendTransaction" &&
      params !== undefined &&
      params.length > 0
    ) {
      const originalTxObject = params[0] as Partial<Tx>;
      const txObject = { ...originalTxObject };

      if (txObject.gasPrice === undefined && this.automaticGasPrice) {
        txObject.gasPrice = await this.send("eth_gasPrice");
      }

      if (txObject.gas === undefined && this.automaticGasLimit) {
        txObject.gas = await this.send("eth_estimateGas", [txObject]);
      }

      params = [...params];
      params[0] = txObject;
    }

    return super.send(method, params);
  }
}
