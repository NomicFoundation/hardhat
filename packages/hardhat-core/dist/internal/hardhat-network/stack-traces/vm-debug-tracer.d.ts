import VM from "@ethereumjs/vm";
import { RpcDebugTracingConfig } from "../../core/jsonrpc/types/input/debugTraceTransaction";
import { RpcDebugTraceOutput } from "../provider/output";
export declare class VMDebugTracer {
    private readonly _vm;
    private _lastTrace?;
    private _config;
    private _messages;
    private _addressToStorage;
    constructor(_vm: VM);
    /**
     * Run the `action` callback and trace its execution
     */
    trace(action: () => Promise<void>, config: RpcDebugTracingConfig): Promise<RpcDebugTraceOutput>;
    private _enableTracing;
    private _disableTracing;
    private _getDebugTrace;
    private _beforeTxHandler;
    private _beforeMessageHandler;
    private _stepHandler;
    private _afterMessageHandler;
    private _afterTxHandler;
    private _messageToNestedStructLogs;
    private _getMemory;
    private _getStack;
    private _stepToStructLog;
    private _memoryGas;
    private _sha3WordGas;
    private _callConstantGas;
    private _callNewAccountGas;
    private _callValueTransferGas;
    private _quadCoeffDiv;
    private _isAddressEmpty;
    private _getContractStorage;
    private _getContractCode;
    private _callDynamicGas;
    private _callGas;
    /**
     * Returns the increase in gas and the number of added words
     */
    private _memoryExpansion;
    private _getFromStack;
    private _memoryFee;
}
//# sourceMappingURL=vm-debug-tracer.d.ts.map