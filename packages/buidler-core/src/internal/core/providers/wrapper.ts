import { EIP1193Provider, RequestArguments } from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";

export abstract class ProviderWrapper extends EventEmitterWrapper
  implements EIP1193Provider {
  constructor(protected readonly _wrappedProvider: EIP1193Provider) {
    super(_wrappedProvider);
  }

  public abstract async request(args: RequestArguments): Promise<unknown>;

  protected _getParams<ParamsT = any[]>(args: RequestArguments): ParamsT | [] {
    if (args.params === undefined) {
      return [];
    }

    return args.params as ParamsT;
  }
}
