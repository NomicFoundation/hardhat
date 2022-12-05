import { EvmError } from "@nomicfoundation/ethereumjs-evm";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";

export enum ExitCode {
  SUCCESS,
  REVERT,
  OUT_OF_GAS,
  INTERNAL_ERROR,
  INVALID_OPCODE,
  CODESIZE_EXCEEDS_MAXIMUM,
}

const exitCodeToRethnetExitCode: Record<ExitCode, number> = {
  [ExitCode.SUCCESS]: 0x00,
  [ExitCode.REVERT]: 0x20,
  [ExitCode.OUT_OF_GAS]: 0x50,
  [ExitCode.INTERNAL_ERROR]: 0x20,
  [ExitCode.INVALID_OPCODE]: 0x53,
  [ExitCode.CODESIZE_EXCEEDS_MAXIMUM]: 0x65,
};

export class Exit {
  public static fromRethnetExitCode(rethnetExitCode: number): Exit {
    switch (rethnetExitCode) {
      case 0x00:
      case 0x01:
      case 0x02:
      case 0x03:
        return new Exit(ExitCode.SUCCESS);
      case 0x20:
        return new Exit(ExitCode.REVERT);
      case 0x50:
        return new Exit(ExitCode.OUT_OF_GAS);
      case 0x51:
      case 0x53:
        return new Exit(ExitCode.INVALID_OPCODE);
      case 0x65:
        return new Exit(ExitCode.CODESIZE_EXCEEDS_MAXIMUM);
      default: {
        // TODO temporary, should be removed in production
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw new Error(`Unmatched rethnet exit code: ${rethnetExitCode}`);
      }
    }
  }

  public static fromEthereumJSEvmError(evmError: EvmError | undefined): Exit {
    if (evmError === undefined) {
      return new Exit(ExitCode.SUCCESS);
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

    // TODO temporary, should be removed in production
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new Error(`Unmatched rethnet exit code: ${evmError.error}`);
  }

  constructor(public kind: ExitCode) {}

  public isError(): boolean {
    return this.kind !== ExitCode.SUCCESS;
  }

  public getReason(): string {
    switch (this.kind) {
      case ExitCode.SUCCESS:
        return "Success";
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
    }

    const _exhaustiveCheck: never = this.kind;
  }

  public getEthereumJSError(): EvmError | undefined {
    switch (this.kind) {
      case ExitCode.SUCCESS:
        return;
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
    }

    const _exhaustiveCheck: never = this.kind;
  }

  public getRethnetExitCode(): number {
    return exitCodeToRethnetExitCode[this.kind];
  }
}
