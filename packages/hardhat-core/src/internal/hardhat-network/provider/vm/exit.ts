import { EVMResult, EvmError } from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";
import { ExceptionalHalt, SuccessReason } from "rethnet-evm";

export enum ExitCode {
  STOP,
  RETURN,
  SELF_DESTRUCT,
  REVERT,
  OUT_OF_GAS,
  INTERNAL_ERROR,
  INVALID_OPCODE,
  CODESIZE_EXCEEDS_MAXIMUM,
  CREATE_COLLISION,
}

export class Exit {
  public static fromRethnetSuccessReason(reason: SuccessReason): Exit {
    switch (reason) {
      case SuccessReason.Stop:
        return new Exit(ExitCode.STOP);
      case SuccessReason.Return:
        return new Exit(ExitCode.RETURN);
      case SuccessReason.SelfDestruct:
        return new Exit(ExitCode.SELF_DESTRUCT);
    }
  }

  public static fromRethnetExceptionalHalt(halt: ExceptionalHalt): Exit {
    switch (halt) {
      case ExceptionalHalt.OutOfGas:
        return new Exit(ExitCode.OUT_OF_GAS);

      case ExceptionalHalt.OpcodeNotFound:
      case ExceptionalHalt.InvalidFEOpcode:
        return new Exit(ExitCode.INVALID_OPCODE);

      case ExceptionalHalt.CreateCollision:
        return new Exit(ExitCode.CREATE_COLLISION);

      case ExceptionalHalt.CreateContractSizeLimit:
        return new Exit(ExitCode.CODESIZE_EXCEEDS_MAXIMUM);

      default: {
        // TODO temporary, should be removed in production
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw new Error(`Unmatched rethnet exceptional halt: ${halt}`);
      }
    }
  }

  public static fromEthereumJSEvmResult(result: EVMResult): Exit {
    const evmError = result.execResult.exceptionError;
    if (evmError === undefined) {
      // TODO: Figure out which of STOP | RETURN | SELF_DESTRUCT
      if (
        result.execResult.selfdestruct !== undefined &&
        Object.keys(result.execResult.selfdestruct).length > 0
      ) {
        return new Exit(ExitCode.SELF_DESTRUCT);
      } else if (
        result.createdAddress !== undefined ||
        result.execResult.returnValue.length > 0
      ) {
        return new Exit(ExitCode.RETURN);
      } else {
        return new Exit(ExitCode.STOP);
      }
    }

    if (evmError.error === ERROR.REVERT) {
      return new Exit(ExitCode.REVERT);
    }

    if (evmError.error === ERROR.OUT_OF_GAS) {
      return new Exit(ExitCode.OUT_OF_GAS);
    }

    if (evmError.error === ERROR.INTERNAL_ERROR) {
      return new Exit(ExitCode.INTERNAL_ERROR);
    }

    if (evmError.error === ERROR.INVALID_OPCODE) {
      return new Exit(ExitCode.INVALID_OPCODE);
    }

    if (evmError.error === ERROR.CODESIZE_EXCEEDS_MAXIMUM) {
      return new Exit(ExitCode.CODESIZE_EXCEEDS_MAXIMUM);
    }

    if (evmError.error === ERROR.CREATE_COLLISION) {
      return new Exit(ExitCode.CREATE_COLLISION);
    }

    // TODO temporary, should be removed in production
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new Error(`Unmatched evm error: ${evmError.error}`);
  }

  constructor(public kind: ExitCode) {}

  public isSuccess(): boolean {
    return this.kind <= ExitCode.SELF_DESTRUCT;
  }

  public isError(): boolean {
    return this.kind > ExitCode.SELF_DESTRUCT;
  }

  public getReason(): string {
    switch (this.kind) {
      case ExitCode.STOP:
        return "Stopped";
      case ExitCode.RETURN:
        return "Returned";
      case ExitCode.SELF_DESTRUCT:
        return "Self destructed";
      case ExitCode.REVERT:
        return "Reverted";
      case ExitCode.OUT_OF_GAS:
        return "Out of gas";
      case ExitCode.INTERNAL_ERROR:
        return "Internal error";
      case ExitCode.INVALID_OPCODE:
        return "Invalid opcode";
      case ExitCode.CODESIZE_EXCEEDS_MAXIMUM:
        return "Codesize exceeds maximum";
      case ExitCode.CREATE_COLLISION:
        return "Create collision";
    }

    const _exhaustiveCheck: never = this.kind;
  }

  public getEthereumJSError(): EvmError | undefined {
    switch (this.kind) {
      case ExitCode.STOP:
      case ExitCode.RETURN:
      case ExitCode.SELF_DESTRUCT:
        return undefined;
      case ExitCode.REVERT:
        return new EvmError(ERROR.REVERT);
      case ExitCode.OUT_OF_GAS:
        return new EvmError(ERROR.OUT_OF_GAS);
      case ExitCode.INTERNAL_ERROR:
        return new EvmError(ERROR.INTERNAL_ERROR);
      case ExitCode.INVALID_OPCODE:
        return new EvmError(ERROR.INVALID_OPCODE);
      case ExitCode.CODESIZE_EXCEEDS_MAXIMUM:
        return new EvmError(ERROR.CODESIZE_EXCEEDS_MAXIMUM);
      case ExitCode.CREATE_COLLISION:
        return new EvmError(ERROR.CREATE_COLLISION);
    }

    const _exhaustiveCheck: never = this.kind;
  }

  public getRethnetExceptionalHalt(): ExceptionalHalt {
    switch (this.kind) {
      case ExitCode.OUT_OF_GAS:
        return ExceptionalHalt.OutOfGas;
      case ExitCode.INVALID_OPCODE:
        return ExceptionalHalt.OpcodeNotFound;
      case ExitCode.CODESIZE_EXCEEDS_MAXIMUM:
        return ExceptionalHalt.CreateContractSizeLimit;

      default:
        // TODO temporary, should be removed in production
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw new Error(`Unmatched rethnet exceptional halt: ${this.kind}`);
    }
  }
}
