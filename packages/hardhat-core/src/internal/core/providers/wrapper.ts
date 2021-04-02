import { EIP1193Provider, RequestArguments } from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";

import { InvalidInputError } from "./errors";

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
      // tslint:disable-next-line only-hardhat-error
      throw new InvalidInputError(
        "Hardhat Network doesn't support JSON-RPC params sent as an object"
      );
    }

    return params as ParamsT;
  }
}
