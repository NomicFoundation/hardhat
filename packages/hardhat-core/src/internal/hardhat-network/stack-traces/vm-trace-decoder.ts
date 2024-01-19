import chalk from "chalk";
import debug from "debug";
import { Reporter } from "../../sentry/reporter";
import { TracingConfig } from "../provider/node-types";
import { createModelsAndDecodeBytecodes } from "./compiler-to-model";
import { ContractsIdentifier } from "./contracts-identifier";
import { isEvmStep, isPrecompileTrace, MessageTrace } from "./message-trace";
import { Bytecode } from "./model";

const log = debug("hardhat:core:hardhat-network:node");

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

export function initializeVmTraceDecoder(
  vmTraceDecoder: VmTraceDecoder,
  tracingConfig: TracingConfig
) {
  if (tracingConfig.buildInfos === undefined) {
    return;
  }

  try {
    for (const buildInfo of tracingConfig.buildInfos) {
      const bytecodes = createModelsAndDecodeBytecodes(
        buildInfo.solcVersion,
        buildInfo.input,
        buildInfo.output
      );

      for (const bytecode of bytecodes) {
        vmTraceDecoder.addBytecode(bytecode);
      }
    }
  } catch (error) {
    console.warn(
      chalk.yellow(
        "The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."
      )
    );

    log(
      "Hardhat Network tracing disabled: ContractsIdentifier failed to be initialized. Please report this to help us improve Hardhat.\n",
      error
    );

    if (error instanceof Error) {
      Reporter.reportError(error);
    }
  }
}
