import semver from "semver";

import { getUserConfigPath } from "../../core/project-structure";

import { ContractsIdentifier } from "./contracts-identifier";
import { printMessageTrace } from "./debug";
import {
  DecodedCallMessageTrace,
  DecodedCreateMessageTrace,
  DecodedEvmMessageTrace,
  EvmMessageTrace,
  EvmStep,
  isCreateTrace,
  isDecodedCallTrace,
  isDecodedCreateTrace,
  isEvmStep,
  isPrecompileTrace,
  MessageTrace,
  PrecompileMessageTrace
} from "./message-trace";
import {
  Bytecode,
  ContractFunction,
  ContractFunctionType,
  ContractType,
  Instruction,
  JumpType,
  SourceLocation
} from "./model";
import { isCall, isCreate, Opcode } from "./opcodes";
import {
  CallFailedErrorStackTraceEntry,
  CallstackEntryStackTraceEntry,
  CONSTRUCTOR_FUNCTION_NAME,
  FALLBACK_FUNCTION_NAME,
  OtherExecutionErrorStackTraceEntry,
  RevertErrorStackTraceEntry,
  SolidityStackTrace,
  SolidityStackTraceEntry,
  SourceReference,
  StackTraceEntryType
} from "./solidity-stack-trace";

// tslint:disable only-buidler-error

export const FIRST_SOLC_VERSION_SUPPORTED = "0.5.1";
const FIRST_SOLC_VERSION_CREATE_PARAMS_VALIDATION = "0.5.9";

export class SolidityTracer {
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
      steps: messageTrace.steps.map(s =>
        isEvmStep(s) ? s : this.tryToDecodeMessageTrace(s)
      )
    };
  }

  public getStackTrace(
    maybeDecodedMessageTrace: MessageTrace
  ): SolidityStackTrace {
    if (maybeDecodedMessageTrace.error === undefined) {
      return [];
    }

    if (isPrecompileTrace(maybeDecodedMessageTrace)) {
      return this._getPrecompileMessageStackTrace(maybeDecodedMessageTrace);
    }

    if (isDecodedCreateTrace(maybeDecodedMessageTrace)) {
      return this._getCreateMessageStackTrace(maybeDecodedMessageTrace);
    }

    if (isDecodedCallTrace(maybeDecodedMessageTrace)) {
      return this._getCallMessageStackTrace(maybeDecodedMessageTrace);
    }

    return this._getUnrecognizedMessageStackTrace(maybeDecodedMessageTrace);
  }

  private _getCallMessageStackTrace(
    trace: DecodedCallMessageTrace
  ): SolidityStackTrace {
    if (this._isDirectLibraryCall(trace)) {
      return this._getDirectLibraryCallErrorStackTrace(trace);
    }

    const calledFunction = trace.bytecode.contract.getFunctionFromSelector(
      trace.calldata.slice(0, 4)
    );

    if (this._isFunctionNotPayableError(trace, calledFunction)) {
      return [
        {
          type: StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR,
          sourceReference: this._getFunctionStartSourceReference(
            trace,
            calledFunction!
          ),
          value: trace.value
        }
      ];
    }

    if (this._isMissingFunctionAndFallbackError(trace, calledFunction)) {
      return [
        {
          type:
            StackTraceEntryType.UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR,
          sourceReference: this._getContractStartWithoutFunctionSourceReference(
            trace
          )
        }
      ];
    }

    if (this._isFallbackNotPayableError(trace, calledFunction)) {
      return [
        {
          type: StackTraceEntryType.FALLBACK_NOT_PAYABLE_ERROR,
          sourceReference: this._getFallbackStartSourceReference(trace),
          value: trace.value
        }
      ];
    }

    return this._traceEvmExecution(trace);
  }

  private _getUnrecognizedMessageStackTrace(
    trace: EvmMessageTrace
  ): SolidityStackTrace {
    const subtrace = this._getLastSubtrace(trace);

    if (subtrace !== undefined) {
      // This is not a very exact heuristic, but most of the time it will be right, as solidity
      // reverts if a call fails, and most contracts are in solidity
      if (
        subtrace.error !== undefined &&
        trace.returnData.equals(subtrace.returnData)
      ) {
        let unrecognizedEntry: SolidityStackTraceEntry;

        if (isCreateTrace(trace)) {
          unrecognizedEntry = {
            type: StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY
          };
        } else {
          unrecognizedEntry = {
            type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY,
            address: trace.address
          };
        }

        return [unrecognizedEntry, ...this.getStackTrace(subtrace)];
      }
    }

    if (isCreateTrace(trace)) {
      return [
        {
          type: StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR,
          message: trace.returnData
        }
      ];
    }

    return [
      {
        type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR,
        address: trace.address,
        message: trace.returnData
      }
    ];
  }

  private _getCreateMessageStackTrace(
    trace: DecodedCreateMessageTrace
  ): SolidityStackTrace {
    if (this._isConstructorNotPayableError(trace)) {
      return [
        {
          type: StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR,
          sourceReference: this._getConstructorStartSourceReference(trace),
          value: trace.value
        }
      ];
    }

    if (this._isConstructorInvalidArgumentsError(trace)) {
      return [
        {
          type: StackTraceEntryType.INVALID_PARAMS_ERROR,
          sourceReference: this._getConstructorStartSourceReference(trace)
        }
      ];
    }

    return this._traceEvmExecution(trace);
  }

  private _getPrecompileMessageStackTrace(
    trace: PrecompileMessageTrace
  ): SolidityStackTrace {
    return [
      {
        type: StackTraceEntryType.PRECOMPILE_ERROR,
        precompile: trace.precompile
      }
    ];
  }

  private _traceEvmExecution(
    trace: DecodedEvmMessageTrace
  ): SolidityStackTrace {
    const stacktrace: SolidityStackTrace = [];

    let subtracesSeen = 0;
    let jumpedIntoFunction = false;
    const functionJumpdests: Instruction[] = [];
    let consumedAllInstructions = false;

    for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex++) {
      const step = trace.steps[stepIndex];
      const nextStep = trace.steps[stepIndex + 1];

      if (isEvmStep(step)) {
        const inst = trace.bytecode.getInstruction(step.pc);

        if (inst.jumpType === JumpType.INTO_FUNCTION) {
          const nextEvmStep = nextStep as EvmStep; // A jump can't be followed by a subtrace
          const nextInst = trace.bytecode.getInstruction(nextEvmStep.pc);

          if (nextInst !== undefined && nextInst.opcode === Opcode.JUMPDEST) {
            if (jumpedIntoFunction || !isDecodedCallTrace(trace)) {
              stacktrace.push(
                this._instructionToCallstackStackTraceEntry(
                  trace.bytecode,
                  inst
                )
              );
            }

            jumpedIntoFunction = true;
            functionJumpdests.push(nextInst);
          }
        } else if (inst.jumpType === JumpType.OUTOF_FUNCTION) {
          stacktrace.pop();
          functionJumpdests.pop();
        } else if (isCall(inst.opcode) || isCreate(inst.opcode)) {
          // If a call can't be executed, we don't get an execution trace from it. We can detect
          // this by checking if the next step is an EvmStep.
          if (nextStep !== undefined && isEvmStep(nextStep)) {
            if (this._isCallFailedError(trace, stepIndex, inst)) {
              stacktrace.push(
                this._callInstructionToCallFailedToExecuteStackTraceEntry(
                  trace.bytecode,
                  inst
                )
              );

              consumedAllInstructions = true;
              break;
            }
          } else {
            stacktrace.push(
              this._instructionToCallstackStackTraceEntry(trace.bytecode, inst)
            );
          }
        } else if (
          inst.opcode === Opcode.REVERT ||
          inst.opcode === Opcode.INVALID
        ) {
          // Failures with invalid locations are handled later
          if (inst.location === undefined) {
            continue;
          }

          if (isDecodedCallTrace(trace) && !jumpedIntoFunction) {
            // Failures in the prelude are resolved later.
            continue;
          }

          // There should always be a function here, but that's not the case with optimizations.
          //
          // If this is a create trace, we already checked args and nonpayable failures before
          // calling this function.
          //
          // If it's a call trace, we already jumped into a function. But optimizations can happen.
          const failingFunction = inst.location.getContainingFunction();

          // If the failure is in a modifier we add an entry with the function/constructor
          if (
            failingFunction !== undefined &&
            failingFunction.type === ContractFunctionType.MODIFIER
          ) {
            stacktrace.push(
              this._getEntryBeforeFailureInModifier(trace, functionJumpdests)
            );
          }

          if (failingFunction !== undefined) {
            stacktrace.push(
              this._instructionWithinFunctionToRevertStackTraceEntry(
                trace,
                inst
              )
            );
          } else if (isDecodedCallTrace(trace)) {
            // This is here because of the optimizations
            stacktrace.push({
              type: StackTraceEntryType.REVERT_ERROR,
              sourceReference: this._getFunctionStartSourceReference(
                trace,
                trace.bytecode.contract.getFunctionFromSelector(
                  trace.calldata.slice(0, 4)
                )!
              ),
              message: trace.returnData
            });
          } else {
            // This is here because of the optimizations
            stacktrace.push({
              type: StackTraceEntryType.REVERT_ERROR,
              sourceReference: this._getConstructorStartSourceReference(trace),
              message: trace.returnData
            });
          }

          consumedAllInstructions = true;
          break;
        }
      } else {
        subtracesSeen += 1;

        // If there are more subtraces, this one didn't terminate the execution
        if (subtracesSeen < trace.numberOfSubtraces) {
          stacktrace.pop();
          continue;
        }

        if (step.error === undefined) {
          // If this is a subtrace, we pushed a stack frame pointing to the instruction that
          // generated the subtrace.
          const callStackFrame = stacktrace.pop()! as CallstackEntryStackTraceEntry;

          if (this._isReturnDataSizeError(trace, stepIndex)) {
            stacktrace.push({
              type: StackTraceEntryType.RETURNDATA_SIZE_ERROR,
              sourceReference: callStackFrame.sourceReference
            });

            consumedAllInstructions = true;
            break;
          }
        } else {
          if (
            this._isSubtraceErrorPropagated(trace, stepIndex) ||
            (isDecodedCallTrace(trace) &&
              this._isProxyErrorPropagated(trace, stepIndex))
          ) {
            const subTrace = this.getStackTrace(step);
            stacktrace.push(...subTrace);

            consumedAllInstructions = true;
            break;
          }

          stacktrace.pop();
        }
      }
    }

    if (consumedAllInstructions) {
      const firstEntry = stacktrace[0];
      if (
        firstEntry.type === StackTraceEntryType.CALLSTACK_ENTRY &&
        firstEntry.functionType === ContractFunctionType.MODIFIER
      ) {
        stacktrace.unshift(
          this._getEntryBeforeInitialModifierCallstackEntry(trace)
        );
      }

      return stacktrace;
    }

    const lastStep = trace.steps[trace.steps.length - 1];

    if (!isEvmStep(lastStep)) {
      throw new Error(
        "This should not happen: MessageTrace ends with a subtrace"
      );
    }

    const lastInstruction = trace.bytecode.getInstruction(lastStep.pc);

    if (isDecodedCallTrace(trace) && !jumpedIntoFunction) {
      if (this._hasFailedInsideTheFallbackFunction(trace)) {
        return [
          this._instructionWithinFunctionToRevertStackTraceEntry(
            trace,
            lastInstruction
          )
        ];
      }

      // This is here because of the optimizations
      if (lastInstruction.location !== undefined) {
        const failingFunction = lastInstruction.location.getContainingFunction();
        if (failingFunction !== undefined) {
          return [
            {
              type: StackTraceEntryType.REVERT_ERROR,
              sourceReference: this._getFunctionStartSourceReference(
                trace,
                failingFunction
              ),
              message: trace.returnData
            }
          ];
        }
      }

      const calledFunction = trace.bytecode.contract.getFunctionFromSelector(
        trace.calldata.slice(0, 4)
      );

      if (calledFunction !== undefined) {
        return [
          {
            type: StackTraceEntryType.INVALID_PARAMS_ERROR,
            sourceReference: this._getFunctionStartSourceReference(
              trace,
              calledFunction
            )
          }
        ];
      }

      return [this._getOtherErrorBeforeCalledFunctionStackTraceEntry(trace)];
    }

    if (this._isCalledNonContractAccountError(trace)) {
      stacktrace.push({
        type: StackTraceEntryType.NONCONTRACT_ACCOUNT_CALLED_ERROR,
        // We are sure this is not undefined because there was at least a call instruction
        sourceReference: this._getLastSourceReference(trace)!
      });
    } else {
      stacktrace.push({
        type: StackTraceEntryType.OTHER_EXECUTION_ERROR,
        sourceReference: this._getLastSourceReference(trace)
      });
    }

    return stacktrace;
  }

  // Heuristics

  private _isSubtraceErrorPropagated(
    trace: DecodedEvmMessageTrace,
    callSubtraceStepIndex: number
  ): boolean {
    const call = trace.steps[callSubtraceStepIndex] as MessageTrace;

    if (!trace.returnData.equals(call.returnData)) {
      return false;
    }

    return this._failsRightAfterCall(trace, callSubtraceStepIndex);
  }

  private _isReturnDataSizeError(
    trace: DecodedEvmMessageTrace,
    callStepIndex: number
  ): boolean {
    return this._failsRightAfterCall(trace, callStepIndex);
  }

  private _failsRightAfterCall(
    trace: DecodedEvmMessageTrace,
    callSubtraceStepIndex: number
  ): boolean {
    const lastStep = trace.steps[trace.steps.length - 1];
    if (!isEvmStep(lastStep)) {
      return false;
    }

    const lastInst = trace.bytecode.getInstruction(lastStep.pc);
    if (lastInst.opcode !== Opcode.REVERT) {
      return false;
    }

    const callOpcodeStep = trace.steps[callSubtraceStepIndex - 1] as EvmStep;
    const callInst = trace.bytecode.getInstruction(callOpcodeStep.pc);

    return this._isLastLocation(
      trace,
      callSubtraceStepIndex + 1,
      callInst.location! // Calls are always made from within functions
    );
  }

  private _isCalledNonContractAccountError(
    trace: DecodedEvmMessageTrace
  ): boolean {
    // We could change this to checking that the last valid location maps to a call, but
    // it's way more complex as we need to get the ast node from that location.

    const lastIndex = this._getLastInstructionWithValidLocationStepIndex(trace);
    if (lastIndex === undefined || lastIndex === 0) {
      return false;
    }

    const lastStep = trace.steps[lastIndex] as EvmStep; // We know this is an EVM step
    const lastInst = trace.bytecode.getInstruction(lastStep.pc);
    if (lastInst.opcode !== Opcode.ISZERO) {
      return false;
    }

    const prevStep = trace.steps[lastIndex - 1] as EvmStep; // We know this is an EVM step
    const prevInst = trace.bytecode.getInstruction(prevStep.pc);
    return prevInst.opcode === Opcode.EXTCODESIZE;
  }

  private _isCallFailedError(
    trace: DecodedEvmMessageTrace,
    instIndex: number,
    callInstruction: Instruction
  ): boolean {
    const callLocation = callInstruction.location!; // Calls are always made from within functions
    return this._isLastLocation(trace, instIndex, callLocation);
  }

  private _hasFailedInsideTheFallbackFunction(
    trace: DecodedCallMessageTrace
  ): boolean {
    const contract = trace.bytecode.contract;

    if (contract.fallback === undefined) {
      return false;
    }

    const lastStep = trace.steps[trace.steps.length - 1] as EvmStep;
    const lastInstruction = trace.bytecode.getInstruction(lastStep.pc);

    return (
      lastInstruction.location !== undefined &&
      lastInstruction.opcode === Opcode.REVERT &&
      contract.fallback.location.contains(lastInstruction.location)
    );
  }

  private _isProxyErrorPropagated(
    trace: DecodedCallMessageTrace,
    callSubtraceStepIndex: number
  ): boolean {
    const callStep = trace.steps[callSubtraceStepIndex - 1];
    if (!isEvmStep(callStep)) {
      return false;
    }

    const callInst = trace.bytecode.getInstruction(callStep.pc);
    if (callInst.opcode !== Opcode.DELEGATECALL) {
      return false;
    }

    const subtrace = trace.steps[callSubtraceStepIndex];
    if (isEvmStep(subtrace)) {
      return false;
    }

    if (isPrecompileTrace(subtrace)) {
      return false;
    }

    // If we can't recognize the implementation we'd better don't consider it as such
    if (subtrace.bytecode === undefined) {
      return false;
    }

    if (subtrace.bytecode.contract.type === ContractType.LIBRARY) {
      return false;
    }

    if (!trace.returnData.equals(subtrace.returnData)) {
      return false;
    }

    for (let i = callSubtraceStepIndex + 1; i < trace.steps.length; i++) {
      const step = trace.steps[i];
      if (!isEvmStep(step)) {
        return false;
      }

      const inst = trace.bytecode.getInstruction(step.pc);

      // All the remaining locations should be valid, as they are part of the inline asm
      if (inst.location === undefined) {
        return false;
      }

      if (
        inst.jumpType === JumpType.INTO_FUNCTION ||
        inst.jumpType === JumpType.OUTOF_FUNCTION
      ) {
        return false;
      }
    }

    const lastStep = trace.steps[trace.steps.length - 1] as EvmStep;
    const lastInst = trace.bytecode.getInstruction(lastStep.pc);

    return lastInst.opcode === Opcode.REVERT;
  }

  private _isConstructorNotPayableError(
    trace: DecodedCreateMessageTrace
  ): boolean {
    // This error doesn't return data
    if (trace.returnData.length > 0) {
      return false;
    }

    const constructor = trace.bytecode.contract.constructorFunction;

    // This function is only matters with contracts that have constructors defined. The ones that
    // don't are abstract contracts, or their constructor doesn't take any argument.
    if (constructor === undefined) {
      return false;
    }

    return (
      trace.value.gtn(0) &&
      (constructor.isPayable === undefined || !constructor.isPayable)
    );
  }

  private _isConstructorInvalidArgumentsError(
    trace: DecodedCreateMessageTrace
  ): boolean {
    // This error doesn't return data
    if (trace.returnData.length > 0) {
      return false;
    }

    const contract = trace.bytecode.contract;
    const constructor = contract.constructorFunction;

    // This function is only matters with contracts that have constructors defined. The ones that
    // don't are abstract contracts, or their constructor doesn't take any argument.
    if (constructor === undefined) {
      return false;
    }

    if (
      semver.lt(
        trace.bytecode.compilerVersion,
        FIRST_SOLC_VERSION_CREATE_PARAMS_VALIDATION
      )
    ) {
      return false;
    }

    const lastStep = trace.steps[trace.steps.length - 1];
    if (!isEvmStep(lastStep)) {
      return false;
    }

    const lastInst = trace.bytecode.getInstruction(lastStep.pc);
    if (lastInst.opcode !== Opcode.REVERT || lastInst.location !== undefined) {
      return false;
    }

    // tslint:disable-next-line prefer-for-of
    for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex++) {
      const step = trace.steps[stepIndex];
      if (!isEvmStep(step)) {
        return false;
      }

      const inst = trace.bytecode.getInstruction(step.pc);

      if (
        inst.location !== undefined &&
        !contract.location.equals(inst.location) &&
        !constructor.location.equals(inst.location)
      ) {
        return false;
      }
    }

    return true;
  }

  private _isDirectLibraryCall(trace: DecodedCallMessageTrace): boolean {
    return (
      trace.depth === 0 && trace.bytecode.contract.type === ContractType.LIBRARY
    );
  }

  private _isFunctionNotPayableError(
    trace: DecodedCallMessageTrace,
    calledFunction: ContractFunction | undefined
  ): boolean {
    if (calledFunction === undefined) {
      return false;
    }

    // This error doesn't return data
    if (trace.returnData.length > 0) {
      return false;
    }

    if (trace.value.lten(0)) {
      return false;
    }

    // Libraries don't have a nonpayable check
    if (trace.bytecode.contract.type === ContractType.LIBRARY) {
      return false;
    }

    return calledFunction.isPayable === undefined || !calledFunction.isPayable;
  }

  private _isMissingFunctionAndFallbackError(
    trace: DecodedCallMessageTrace,
    calledFunction: ContractFunction | undefined
  ): boolean {
    // This error doesn't return data
    if (trace.returnData.length > 0) {
      return false;
    }

    return (
      calledFunction === undefined &&
      trace.bytecode.contract.fallback === undefined
    );
  }

  private _isFallbackNotPayableError(
    trace: DecodedCallMessageTrace,
    calledFunction: ContractFunction | undefined
  ): boolean {
    if (calledFunction !== undefined) {
      return false;
    }

    // This error doesn't return data
    if (trace.returnData.length > 0) {
      return false;
    }

    if (trace.value.lten(0)) {
      return false;
    }

    if (trace.bytecode.contract.fallback === undefined) {
      return false;
    }

    const isPayable = trace.bytecode.contract.fallback.isPayable;

    return isPayable === undefined || !isPayable;
  }

  // Stack trace entry factories

  private _getDirectLibraryCallErrorStackTrace(
    trace: DecodedCallMessageTrace
  ): SolidityStackTrace {
    const func = trace.bytecode.contract.getFunctionFromSelector(
      trace.calldata.slice(0, 4)
    );

    if (func !== undefined) {
      return [
        {
          type: StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR,
          sourceReference: this._getFunctionStartSourceReference(trace, func)
        }
      ];
    }

    return [
      {
        type: StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR,
        sourceReference: this._getContractStartWithoutFunctionSourceReference(
          trace
        )
      }
    ];
  }

  private _getOtherErrorBeforeCalledFunctionStackTraceEntry(
    trace: DecodedCallMessageTrace
  ): OtherExecutionErrorStackTraceEntry {
    return {
      type: StackTraceEntryType.OTHER_EXECUTION_ERROR,
      sourceReference: this._getContractStartWithoutFunctionSourceReference(
        trace
      )
    };
  }

  private _instructionToCallstackStackTraceEntry(
    bytecode: Bytecode,
    inst: Instruction
  ): CallstackEntryStackTraceEntry {
    const func = inst.location!.getContainingFunction();

    if (func !== undefined) {
      return {
        type: StackTraceEntryType.CALLSTACK_ENTRY,
        sourceReference: this._sourceLocationToSourceReference(
          bytecode,
          inst.location
        )!,
        functionType: func.type
      };
    }

    return {
      type: StackTraceEntryType.CALLSTACK_ENTRY,
      sourceReference: {
        function: undefined,
        contract: bytecode.contract.name,
        fileGlobalName: inst.location!.file.globalName,
        line: inst.location!.getStartingLineNumber()
      },
      functionType: ContractFunctionType.FUNCTION
    };
  }

  private _callInstructionToCallFailedToExecuteStackTraceEntry(
    bytecode: Bytecode,
    callInst: Instruction
  ): CallFailedErrorStackTraceEntry {
    // Calls only happen within functions
    return {
      type: StackTraceEntryType.CALL_FAILED_ERROR,
      sourceReference: this._sourceLocationToSourceReference(
        bytecode,
        callInst.location
      )!
    };
  }

  private _instructionWithinFunctionToRevertStackTraceEntry(
    trace: DecodedEvmMessageTrace,
    inst: Instruction
  ): RevertErrorStackTraceEntry {
    return {
      type: StackTraceEntryType.REVERT_ERROR,
      sourceReference: this._sourceLocationToSourceReference(
        trace.bytecode,
        inst.location
      )!,
      message: trace.returnData
    };
  }

  private _getEntryBeforeFailureInModifier(
    trace: DecodedEvmMessageTrace,
    functionJumpdests: Instruction[]
  ): CallstackEntryStackTraceEntry {
    // If there's a jumpdest, this modifier belongs to the last function that it represents
    if (functionJumpdests.length > 0) {
      return this._instructionToCallstackStackTraceEntry(
        trace.bytecode,
        functionJumpdests[functionJumpdests.length - 1]
      );
    }

    // This function is only called after we jumped into the initial function in call traces, so
    // there should always be at least a function jumpdest.
    if (!isDecodedCreateTrace(trace)) {
      throw new Error(
        "This shouldn't happen: a call trace has no functionJumpdest but has already jumped into a function"
      );
    }

    // If there's no jump dest, we point to the constructor.
    return {
      type: StackTraceEntryType.CALLSTACK_ENTRY,
      sourceReference: this._getConstructorStartSourceReference(trace),
      functionType: ContractFunctionType.CONSTRUCTOR
    };
  }

  private _getEntryBeforeInitialModifierCallstackEntry(
    trace: DecodedEvmMessageTrace
  ): SolidityStackTraceEntry {
    if (isDecodedCreateTrace(trace)) {
      return {
        type: StackTraceEntryType.CALLSTACK_ENTRY,
        sourceReference: this._getConstructorStartSourceReference(trace),
        functionType: ContractFunctionType.CONSTRUCTOR
      };
    }

    const calledFunction = trace.bytecode.contract.getFunctionFromSelector(
      trace.calldata.slice(0, 4)
    );

    if (calledFunction !== undefined) {
      return {
        type: StackTraceEntryType.CALLSTACK_ENTRY,
        sourceReference: this._getFunctionStartSourceReference(
          trace,
          calledFunction
        ),
        functionType: ContractFunctionType.FUNCTION
      };
    }

    // If it failed or made a call from within a modifier, and the selector doesn't match
    // any function, it must have a fallback.
    return {
      type: StackTraceEntryType.CALLSTACK_ENTRY,
      sourceReference: this._getFallbackStartSourceReference(trace),
      functionType: ContractFunctionType.FALLBACK
    };
  }

  // Source reference factories

  private _getContractStartWithoutFunctionSourceReference(
    trace: DecodedEvmMessageTrace
  ) {
    return {
      fileGlobalName: trace.bytecode.contract.location.file.globalName,
      contract: trace.bytecode.contract.name,
      line: trace.bytecode.contract.location.getStartingLineNumber()
    };
  }

  /**
   * Returns a source reference pointing to the constructor if it exists, or to the contract
   * otherwise.
   */
  private _getConstructorStartSourceReference(
    trace: DecodedCreateMessageTrace
  ): SourceReference {
    const contract = trace.bytecode.contract;
    const constructor = contract.constructorFunction;

    const line =
      constructor !== undefined
        ? constructor.location.getStartingLineNumber()
        : contract.location.getStartingLineNumber();

    return {
      fileGlobalName: contract.location.file.globalName,
      contract: contract.name,
      function: CONSTRUCTOR_FUNCTION_NAME,
      line
    };
  }

  private _getFallbackStartSourceReference(
    trace: DecodedCallMessageTrace
  ): SourceReference {
    const func = trace.bytecode.contract.fallback;

    if (func === undefined) {
      throw new Error(
        "This shouldn't happen: trying to get fallback source reference from a contract without fallback"
      );
    }

    return {
      fileGlobalName: func.location.file.globalName,
      contract: trace.bytecode.contract.name,
      function: FALLBACK_FUNCTION_NAME,
      line: func.location.getStartingLineNumber()
    };
  }

  private _getFunctionStartSourceReference(
    trace: DecodedEvmMessageTrace,
    func: ContractFunction
  ): SourceReference {
    return {
      fileGlobalName: func.location.file.globalName,
      contract: trace.bytecode.contract.name,
      function: func.name,
      line: func.location.getStartingLineNumber()
    };
  }

  private _getLastSourceReference(
    trace: DecodedEvmMessageTrace
  ): SourceReference | undefined {
    for (let i = trace.steps.length - 1; i >= 0; i--) {
      const step = trace.steps[i];
      if (!isEvmStep(step)) {
        continue;
      }

      const inst = trace.bytecode.getInstruction(step.pc);

      if (inst.location === undefined) {
        continue;
      }

      return this._sourceLocationToSourceReference(
        trace.bytecode,
        inst.location
      );
    }

    return undefined;
  }

  private _sourceLocationToSourceReference(
    bytecode: Bytecode,
    location?: SourceLocation
  ): SourceReference | undefined {
    if (location === undefined) {
      return undefined;
    }

    const func = location.getContainingFunction();

    if (func === undefined) {
      return undefined;
    }

    let funcName = func.name;

    if (func.type === ContractFunctionType.CONSTRUCTOR) {
      funcName = CONSTRUCTOR_FUNCTION_NAME;
    } else if (func.type === ContractFunctionType.FALLBACK) {
      funcName = FALLBACK_FUNCTION_NAME;
    }

    return {
      function: funcName,
      contract: bytecode.contract.name,
      fileGlobalName: func.location.file.globalName,
      line: location.getStartingLineNumber()
    };
  }

  // Utils

  private _getLastSubtrace(trace: EvmMessageTrace): MessageTrace | undefined {
    if (trace.numberOfSubtraces < 1) {
      return undefined;
    }

    let i = trace.steps.length - 1;

    while (isEvmStep(trace.steps[i])) {
      i -= 1;
    }

    return trace.steps[i] as MessageTrace;
  }

  private _getLastInstructionWithValidLocationStepIndex(
    trace: DecodedEvmMessageTrace
  ): number | undefined {
    for (let i = trace.steps.length - 1; i >= 0; i--) {
      const step = trace.steps[i];

      if (!isEvmStep(step)) {
        return undefined;
      }

      const inst = trace.bytecode.getInstruction(step.pc);
      if (inst.location !== undefined) {
        return i;
      }
    }

    return undefined;
  }

  private _isLastLocation(
    trace: DecodedEvmMessageTrace,
    fromStep: number,
    location: SourceLocation
  ): boolean {
    for (let i = fromStep; i < trace.steps.length; i++) {
      const step = trace.steps[i];

      if (!isEvmStep(step)) {
        return false;
      }

      const stepInst = trace.bytecode.getInstruction(step.pc);

      if (stepInst.location === undefined) {
        continue;
      }

      if (!location.equals(stepInst.location)) {
        return false;
      }
    }

    return true;
  }
}
