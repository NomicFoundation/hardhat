import type {
  EthereumProvider,
  RequestArguments,
} from "../../../../../types/providers.js";

import { MultipliedGasEstimationProvider } from "../../../../../../test/internal/builtin-plugins/network-manager/providers/gas-provider/multiplied-gas-estimation-provider.js";
import { getParams } from "../utils.js";

export const DEFAULT_GAS_MULTIPLIER = 1;

export class AutomaticGasProvider extends MultipliedGasEstimationProvider {
  constructor(
    provider: EthereumProvider,
    gasMultiplier: number = DEFAULT_GAS_MULTIPLIER,
  ) {
    super(provider, gasMultiplier);
  }

  public async modifyRequest(args: RequestArguments): Promise<void> {
    if (args.method === "eth_sendTransaction") {
      const params = getParams(args);

      // TODO: Should we validate this type?
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = await this.getMultipliedGasEstimation(params);
      }
    }
  }
}
