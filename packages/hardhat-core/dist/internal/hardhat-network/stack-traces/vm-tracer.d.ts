/// <reference types="node" />
import VM from "@ethereumjs/vm";
import { Address } from "ethereumjs-util";
import { MessageTrace } from "./message-trace";
export declare class VMTracer {
    private readonly _vm;
    private readonly _getContractCode;
    private readonly _throwErrors;
    private _messageTraces;
    private _enabled;
    private _lastError;
    constructor(_vm: VM, _getContractCode: (address: Address) => Promise<Buffer>, _throwErrors?: boolean);
    enableTracing(): void;
    disableTracing(): void;
    get enabled(): boolean;
    getLastTopLevelMessageTrace(): MessageTrace | undefined;
    getLastError(): Error | undefined;
    clearLastError(): void;
    private _shouldKeepTracing;
    private _beforeMessageHandler;
    private _stepHandler;
    private _afterMessageHandler;
}
//# sourceMappingURL=vm-tracer.d.ts.map