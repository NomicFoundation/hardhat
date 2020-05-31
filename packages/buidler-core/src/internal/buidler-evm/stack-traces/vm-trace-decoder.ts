import { getUserConfigPath } from "../../core/project-structure";

import { ContractsIdentifier } from "./contracts-identifier";
import { isEvmStep, isPrecompileTrace, MessageTrace } from "./message-trace";

export class VmTraceDecoder {
  constructor(private readonly _contractsIdentifier: ContractsIdentifier) {
    const config = getUserConfigPath();
  }

  public tryToDecodeMessageTrace(messageTrace: MessageTrace): MessageTrace {
    if (isPrecompileTrace(messageTrace)) {
      return messageTrace;
    }

    return {
      ...messageTrace,
      bytecode: this._contractsIdentifier.getBytecodeFromMessageTrace(
        messageTrace
      ),
      steps: messageTrace.steps.map((s) =>
        isEvmStep(s) ? s : this.tryToDecodeMessageTrace(s)
      ),
    };
  }
}
