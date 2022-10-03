import { InternalError } from "../../../core/providers/errors";
import { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import { ExecutionResult, TransactionOutput } from "rethnet-evm"
import { assert, expect } from "chai";
import { ERROR } from "@nomicfoundation/ethereumjs-evm/dist/exceptions";

export function assertHardhatNetworkInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new InternalError(
      `Internal Hardhat Network invariant was violated: ${description}`
    );
  }
}

export function assertEthereumJsAndRethnetResults(
  rethnetResult: ExecutionResult,
  ethereumjsResult: RunTxResult
): asserts rethnetResult {
  assertEthereumJsAndRethnetExitCodes(rethnetResult.exitCode, ethereumjsResult.execResult.exceptionError?.error);
  expect(rethnetResult.gasRefunded, "Gas refunded").to.equal(ethereumjsResult.gasRefund);
  expect(rethnetResult.gasUsed, "Gas used").to.equal(ethereumjsResult.totalGasSpent);
  expect(rethnetResult.output.address, "Created address").to.deep.equal(ethereumjsResult.createdAddress);
  expect(rethnetResult.output.output, "Return value").to.deep.equal(ethereumjsResult.execResult.returnValue);
  // TODO: Compare logs?
}

function assertEthereumJsAndRethnetExitCodes(
  rethnetExitCode: number,
  ethereumjsExitCode: ERROR | undefined
) {
  assert(ethereumjsExitCode === undefined && !(
    rethnetExitCode === 0x00 ||
    rethnetExitCode === 0x02 ||
    rethnetExitCode === 0x03), "Expected a successful exit code");

  const mapping = new Map([
    [ERROR.OUT_OF_GAS, 0x50],
    [ERROR.CODESTORE_OUT_OF_GAS, undefined],
    [ERROR.CODESIZE_EXCEEDS_MAXIMUM, undefined],
    [ERROR.STACK_UNDERFLOW, 0x57],
    [ERROR.STACK_OVERFLOW, 0x58],
    [ERROR.INVALID_JUMP, 0x54],
    [ERROR.INVALID_OPCODE, 0x53],
    [ERROR.OUT_OF_RANGE, 0x59],  // ?
    [ERROR.REVERT, 0x20],
    [ERROR.STATIC_STATE_CHANGE, 0x52], // ?
    [ERROR.INTERNAL_ERROR, undefined],
    [ERROR.CREATE_COLLISION, 0x60],
    [ERROR.STOP, 0x01],
    [ERROR.REFUND_EXHAUSTED, undefined],
    [ERROR.VALUE_OVERFLOW, undefined],
    [ERROR.INSUFFICIENT_BALANCE, undefined],
    [ERROR.INVALID_BEGINSUB, undefined],
    [ERROR.INVALID_RETURNSUB, undefined],
    [ERROR.INVALID_JUMPSUB, undefined],
    [ERROR.INVALID_BYTECODE_RESULT, 0x53], // ?
    [ERROR.INVALID_EOF_FORMAT, undefined],
    [ERROR.INITCODE_SIZE_VIOLATION, 0x64], // ?
    [ERROR.AUTHCALL_UNSET, undefined],
    [ERROR.AUTHCALL_NONZERO_VALUEEXT, undefined],
    [ERROR.AUTH_INVALID_S, undefined],
    [ERROR.BLS_12_381_INVALID_INPUT_LENGTH, undefined],
    [ERROR.BLS_12_381_POINT_NOT_ON_CURVE, undefined],
    [ERROR.BLS_12_381_INPUT_EMPTY, undefined],
    [ERROR.BLS_12_381_FP_NOT_IN_FIELD, undefined]
  ]);

  if (ethereumjsExitCode !== undefined) {
    const expected = mapping[ethereumjsExitCode];
    if (expected !== undefined) {
      expect(expected, "exit code").to.equal(rethnetExitCode);
    }
  }
}
