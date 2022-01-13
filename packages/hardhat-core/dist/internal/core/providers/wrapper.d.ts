import { EIP1193Provider, RequestArguments } from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";
export declare abstract class ProviderWrapper extends EventEmitterWrapper implements EIP1193Provider {
    protected readonly _wrappedProvider: EIP1193Provider;
    constructor(_wrappedProvider: EIP1193Provider);
    abstract request(args: RequestArguments): Promise<unknown>;
    protected _getParams<ParamsT extends any[] = any[]>(args: RequestArguments): ParamsT | [];
}
//# sourceMappingURL=wrapper.d.ts.map