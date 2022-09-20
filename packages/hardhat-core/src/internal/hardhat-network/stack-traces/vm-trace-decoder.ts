import { ContractsIdentifier } from "./contracts-identifier";
import { isEvmStep, isPrecompileTrace, MessageTrace } from "./message-trace";
import { Bytecode } from "./model";

export class VmTraceDecoder {
  constructor(private readonly _contractsIdentifier: ContractsIdentifier) {}

  public tryToDecodeMessageTrace(messageTrace: MessageTrace): MessageTrace {
    if (isPrecompileTrace(messageTrace)) {
      return messageTrace;
    }

    return {
      ...messageTrace,
      bytecode:
        this._contractsIdentifier.getBytecodeFromMessageTrace(messageTrace),
      steps: messageTrace.steps.map((s) =>
        isEvmStep(s) ? s : this.tryToDecodeMessageTrace(s)
      ),
    };
  }

  public addBytecode(bytecode: Bytecode) {
    this._contractsIdentifier.addBytecode(bytecode);
  }
}
