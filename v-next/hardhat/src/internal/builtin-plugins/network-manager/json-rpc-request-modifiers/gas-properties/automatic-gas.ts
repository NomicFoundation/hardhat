import type {
  EthereumProvider,
  RequestArguments,
} from "../../../../../types/providers.js";

import { getParams } from "../utils.js";

import { MultipliedGasEstimation } from "./multiplied-gas-estimation.js";

export const DEFAULT_GAS_MULTIPLIER = 1;

export class AutomaticGas extends MultipliedGasEstimation {
  constructor(
    provider: EthereumProvider,
    gasMultiplier: number = DEFAULT_GAS_MULTIPLIER,
  ) {
    super(provider, gasMultiplier);
  }

  public async modifyRequest(args: RequestArguments): Promise<void> {
    if (args.method === "eth_sendTransaction") {
      const params = getParams(args);

      // TODO: from V2 - Should we validate this type?
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = await this.getMultipliedGasEstimation(params);
      }
    }
  }
}
