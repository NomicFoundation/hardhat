import { ContractsIdentifier } from "./contracts-identifier";
import { MessageTrace } from "./message-trace";
import { Bytecode } from "./model";
export declare class VmTraceDecoder {
    private readonly _contractsIdentifier;
    constructor(_contractsIdentifier: ContractsIdentifier);
    tryToDecodeMessageTrace(messageTrace: MessageTrace): MessageTrace;
    addBytecode(bytecode: Bytecode): void;
}
//# sourceMappingURL=vm-trace-decoder.d.ts.map