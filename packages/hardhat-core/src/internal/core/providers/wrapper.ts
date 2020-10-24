import { EIP1193Provider, RequestArguments } from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";

import { ProviderError } from "./errors";

export abstract class ProviderWrapper extends EventEmitterWrapper
  implements EIP1193Provider {
  constructor(protected readonly _wrappedProvider: EIP1193Provider) {
    super(_wrappedProvider);
  }

  public abstract async request(args: RequestArguments): Promise<unknown>;

  protected _getParams<ParamsT extends any[] = any[]>(
    args: RequestArguments
  ): ParamsT | [] {
    const params = args.params;

    if (params === undefined) {
      return [];
    }

    if (!Array.isArray(params)) {
      // -32000	is Invalid input according to https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes
      // tslint:disable-next-line only-hardhat-error
      throw new ProviderError(
        "Hardhat Network doesn't support JSON-RPC params sent as an object",
        -32000
      );
    }

    return params as ParamsT;
  }
}
