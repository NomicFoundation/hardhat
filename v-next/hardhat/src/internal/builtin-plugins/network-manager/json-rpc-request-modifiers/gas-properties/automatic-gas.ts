import type {
  EthereumProvider,
  RequestArguments,
} from "../../../../../types/providers.js";

import { getRequestParams } from "../../json-rpc.js";

import { MultipliedGasEstimation } from "./multiplied-gas-estimation.js";

export const DEFAULT_GAS_MULTIPLIER = 1;

/**
 * This class modifies transaction requests by automatically estimating the gas required,
 * applying a multiplier to the estimated gas. It extends the `MultipliedGasEstimation` class
 * to handle the gas estimation logic. If no gas value is provided in the transaction,
 * the gas is automatically estimated and multiplied before being added to the request.
 */
export class AutomaticGas extends MultipliedGasEstimation {
  constructor(
    provider: EthereumProvider,
    gasMultiplier: number = DEFAULT_GAS_MULTIPLIER,
  ) {
    super(provider, gasMultiplier);
  }

  public async modifyRequest(args: RequestArguments): Promise<void> {
    if (args.method === "eth_sendTransaction") {
      const params = getRequestParams(args);

      // TODO: from V2 - Should we validate this type?
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = await this.getMultipliedGasEstimation(params);
      }
    }
  }
}
